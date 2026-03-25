import { resolve, basename } from "path";
import { existsSync } from "fs";
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

// ── Image detection ──────────────────────────────────────────

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]);

function isImagePath(p: string): boolean {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTS.has(ext);
}

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

    // 3. Run agent — send intermediate text, track written files
    const channel = this.channels.find((c) => c.name === msg.channel);
    if (!channel) return;

    const ctx = { workDir: session.workDir, taskStore: session.tasks };
    let textBuffer = "";
    const writtenFiles: string[] = [];

    const flushText = async () => {
      const text = textBuffer.trim();
      if (!text) return;
      textBuffer = "";
      await channel.sendText(msg.chatId, text);
    };

    for await (const event of this.runAgent(session.messages, ctx)) {
      switch (event.type) {
        case "text_delta":
          textBuffer += event.content;
          break;

        case "tool_call":
          // Agent is about to call a tool — flush buffered text as progress
          await flushText();
          break;

        case "tool_result":
          // Track files written by agent
          if (!event.is_error) {
            const match = event.content.match(/^Written: (.+)$/);
            if (match) writtenFiles.push(match[1]);
          }
          break;
      }
    }

    // 4. Persist
    saveSession(session);

    // 5. Send remaining text
    await flushText();

    // 6. Send written files as media (like Bubblebot's OutboundMessage.media)
    for (const fp of writtenFiles) {
      const fullPath = resolve(session.workDir, fp);
      if (!existsSync(fullPath)) continue;
      try {
        if (isImagePath(fp)) {
          await channel.sendImage(msg.chatId, fullPath);
        } else {
          await channel.sendFile(msg.chatId, fullPath, basename(fp));
        }
      } catch (e) {
        console.error(`  [channel] send file failed: ${fp}`, e);
      }
    }
  }
}
