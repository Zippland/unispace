import { basename } from "path";
import { paths, loadConfig } from "../config";
import { runAgent } from "../agent";
import {
  createSession,
  findSessionByChannelKey,
  saveSession,
  applyAgentEvent,
  type ChatMessage,
  type Session,
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
  private processing = new Set<string>(); // prevent concurrent per-chat

  /** Initialize channels from channels.json config */
  init(channelsConfig: ChannelsConfig): void {
    if (channelsConfig.feishu?.enabled) {
      // Each channel gets its own sandbox dir under the workspace root for
      // inbound attachments. We use the global workspace dir here so inbox
      // attachments survive project switching.
      const cfg = loadConfig();
      const projectDir = paths.project(cfg.currentProject);
      const ch = new FeishuChannel(
        channelsConfig.feishu,
        projectDir,
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
    const cfg = loadConfig();

    // 1. Find or create session keyed by channel
    let session: Session | undefined = findSessionByChannelKey(chatKey);
    if (!session) {
      session = createSession(cfg.currentProject);
      session.channelKey = chatKey;
      saveSession(session);
    }

    // 2. Build user message content (prepend attachments as a bracket hint)
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

    // 3. Auto-title from first meaningful user message
    if (!session.title) {
      const titleText =
        content.replace(/^\[Attached files:[^\]]*\]\s*/s, "").trim() || content;
      session.title =
        titleText.length > 40 ? titleText.slice(0, 40) + "..." : titleText;
    }

    // 4. Append user + assistant ChatMessages for persistence/display
    session.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", content }],
    });

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [],
    };
    session.messages.push(assistantMsg);

    // 5. Run agent and stream responses back to the channel
    const channel = this.channels.find((c) => c.name === msg.channel);
    if (!channel) return;

    const projectDir = paths.project(session.projectName);

    // Buffer text deltas and flush on tool_call boundaries / at end, so the
    // channel sees clean message chunks instead of per-token streams.
    let textBuffer = "";
    const flushText = async () => {
      const text = textBuffer.trim();
      if (!text) return;
      textBuffer = "";
      try {
        await channel.sendText(msg.chatId, text);
      } catch (e) {
        console.error(`  [channel] sendText failed:`, e);
      }
    };

    for await (const event of runAgent({
      prompt: content,
      cwd: projectDir,
      resumeSessionId: session.sdkSessionId,
    })) {
      // Fold into the stored assistant ChatMessage for display consistency
      applyAgentEvent(event, assistantMsg, session);

      // Forward to channel
      switch (event.type) {
        case "text_delta":
          textBuffer += event.content;
          break;
        case "tool_call":
          // Tool about to run — flush any buffered text as a progress chunk
          await flushText();
          break;
      }
    }

    // 6. Persist and send any trailing text
    saveSession(session);
    await flushText();
  }
}
