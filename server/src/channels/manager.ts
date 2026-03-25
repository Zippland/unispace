import type { Config } from "../config";
import type { ToolRegistry } from "../tools";
import { createAgentRunner } from "../agent";
import {
  createSession,
  findSessionByChannelKey,
  saveSession,
} from "../session";
import type { Channel, InboundMessage, ChannelsConfig } from "./types";
import { FeishuChannel } from "./feishu";

// ── ChannelManager ───────────────────────────────────────────

export class ChannelManager {
  private channels: Channel[] = [];
  private runAgent: ReturnType<typeof createAgentRunner>;
  private workDir: string;
  private processing = new Set<string>(); // prevent concurrent per-chat

  constructor(config: Config, registry: ToolRegistry, workDir: string) {
    this.runAgent = createAgentRunner(config, registry);
    this.workDir = workDir;
  }

  /** Initialize channels from channels.json config */
  init(channelsConfig: ChannelsConfig): void {
    if (channelsConfig.feishu?.enabled) {
      const ch = new FeishuChannel(
        channelsConfig.feishu,
        this.workDir,
        (msg) => this.handleInbound(msg),
      );
      this.channels.push(ch);
    }
  }

  /** Start all enabled channels */
  async startAll(): Promise<void> {
    for (const ch of this.channels) {
      try {
        await ch.start();
        console.log(`  Channel  : ${ch.name} ✓`);
      } catch (e) {
        console.error(`  Channel  : ${ch.name} ✗ —`, e);
      }
    }
  }

  /** Stop all channels */
  async stopAll(): Promise<void> {
    for (const ch of this.channels) {
      try { await ch.stop(); } catch { /* ignore */ }
    }
  }

  /** List active channel names */
  list(): string[] {
    return this.channels.map((c) => c.name);
  }

  // ── Inbound message handling ─────────────────────────────

  private async handleInbound(msg: InboundMessage): Promise<void> {
    const chatKey = `${msg.channel}:${msg.chatId}`;

    // Prevent concurrent processing for the same chat
    if (this.processing.has(chatKey)) {
      console.log(`  [channel] skipping: ${chatKey} is busy`);
      return;
    }
    this.processing.add(chatKey);

    try {
      await this.processMessage(msg, chatKey);
    } catch (e) {
      console.error(`  [channel] error processing ${chatKey}:`, e);
    } finally {
      this.processing.delete(chatKey);
    }
  }

  private async processMessage(
    msg: InboundMessage,
    chatKey: string,
  ): Promise<void> {
    // 1. Find or create session
    let session = findSessionByChannelKey(chatKey);
    if (!session) {
      session = createSession(this.workDir);
      session.channelKey = chatKey;
      saveSession(session);
    }

    // 2. Build user message
    let content = msg.content;
    if (msg.files?.length) {
      const desc = msg.files
        .map((f) => `${f.name} (${f.path})`)
        .join(", ");
      content = content
        ? `[Attached files: ${desc}]\n${content}`
        : `[Attached files: ${desc}]`;
    }

    if (!content) return;

    // Auto-title
    if (!session.title) {
      const titleText = content.replace(/^\[Attached files:[^\]]*\]\s*/s, "").trim() || content;
      session.title = `📡 ${titleText.length > 36 ? titleText.slice(0, 36) + "..." : titleText}`;
    }

    session.messages.push({ role: "user", content });

    // 3. Run agent, collect response
    const ctx = { workDir: session.workDir, taskStore: session.tasks };
    let responseText = "";

    for await (const event of this.runAgent(session.messages, ctx)) {
      if (event.type === "text_delta") {
        responseText += event.content;
      }
    }

    // 4. Persist
    saveSession(session);

    // 5. Send text response through channel
    const channel = this.channels.find((c) => c.name === msg.channel);
    if (channel && responseText) {
      await channel.sendText(msg.chatId, responseText);
    }
  }
}
