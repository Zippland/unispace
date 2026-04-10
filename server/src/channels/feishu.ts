import * as Lark from "@larksuiteoapi/node-sdk";
import { join } from "path";
import { mkdirSync, existsSync, createReadStream } from "fs";
import type { Channel, InboundMessage, FeishuChannelConfig } from "./types";

// ── Dedup cache ──────────────────────────────────────────────

const processed = new Map<string, number>();
const DEDUP_MAX = 1000;

function isDuplicate(messageId: string): boolean {
  if (processed.has(messageId)) return true;
  if (processed.size >= DEDUP_MAX) {
    const oldest = processed.keys().next().value!;
    processed.delete(oldest);
  }
  processed.set(messageId, Date.now());
  return false;
}

// ── FeishuChannel ────────────────────────────────────────────

export class FeishuChannel implements Channel {
  readonly name = "feishu";

  private client: Lark.Client;
  private wsClient?: Lark.WSClient;
  private config: FeishuChannelConfig;
  private onMessage: (msg: InboundMessage) => void;
  private dataDir: string;

  constructor(
    config: FeishuChannelConfig,
    workDir: string,
    onMessage: (msg: InboundMessage) => void,
  ) {
    this.config = config;
    this.onMessage = onMessage;
    this.dataDir = join(workDir, "inbox");

    this.client = new Lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      appType: Lark.AppType.SelfBuild,
      domain: Lark.Domain.Feishu,
    });
  }

  async start(): Promise<void> {
    const dispatcher = new Lark.EventDispatcher({
      encryptKey: this.config.encryptKey || "",
      verificationToken: this.config.verificationToken || "",
    });

    dispatcher.register({
      "im.message.receive_v1": async (data: any) => {
        try {
          await this.handleEvent(data);
        } catch (e) {
          console.error("  [feishu] message handling error:", e);
        }
      },
    });

    this.wsClient = new Lark.WSClient({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      domain: Lark.Domain.Feishu,
      loggerLevel: Lark.LoggerLevel.info,
    });

    await this.wsClient.start({ eventDispatcher: dispatcher });
    console.log("  [feishu] WebSocket connected");
  }

  async stop(): Promise<void> {
    // WSClient cleaned up on process exit
  }

  // ── Send ─────────────────────────────────────────────────

  async sendText(chatId: string, text: string): Promise<void> {
    const idType = this.receiveIdType(chatId);

    await this.client.im.message.create({
      params: { receive_id_type: idType },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ text }),
        msg_type: "text",
      },
    });
  }

  async sendImage(chatId: string, imagePath: string): Promise<void> {
    const imageKey = await this.uploadImage(imagePath);
    if (!imageKey) return;

    const idType = this.receiveIdType(chatId);
    await this.client.im.message.create({
      params: { receive_id_type: idType },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ image_key: imageKey }),
        msg_type: "image",
      },
    });
  }

  async sendFile(
    chatId: string,
    filePath: string,
    fileName: string,
  ): Promise<void> {
    const fileKey = await this.uploadFile(filePath, fileName);
    if (!fileKey) return;

    const idType = this.receiveIdType(chatId);
    await this.client.im.message.create({
      params: { receive_id_type: idType },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ file_key: fileKey }),
        msg_type: "file",
      },
    });
  }

  // ── Inbound event handling ───────────────────────────────

  private async handleEvent(data: any): Promise<void> {
    const msg = data?.message;
    const sender = data?.sender;
    if (!msg || !sender) return;

    // Skip bot messages
    if (sender.sender_type === "app") return;

    // Dedup
    if (isDuplicate(msg.message_id)) return;

    // Random reaction
    this.addReaction(msg.message_id);

    const chatId: string = msg.chat_id;
    const senderId: string = sender.sender_id?.open_id || "unknown";
    const msgType: string = msg.message_type;
    const rawContent: string = msg.content || "{}";

    let text = "";
    const files: InboundMessage["files"] = [];

    switch (msgType) {
      case "text": {
        const parsed = JSON.parse(rawContent);
        text = (parsed.text || "").replace(/@_user_\d+\s*/g, "").trim();
        break;
      }

      case "post": {
        text = this.extractPostText(JSON.parse(rawContent));
        break;
      }

      case "image": {
        const parsed = JSON.parse(rawContent);
        if (parsed.image_key) {
          const path = await this.downloadResource(
            msg.message_id,
            parsed.image_key,
            "image",
            `${parsed.image_key}.png`,
          );
          if (path) files.push({ path, name: `${parsed.image_key}.png`, type: "image" });
        }
        break;
      }

      case "file": {
        const parsed = JSON.parse(rawContent);
        if (parsed.file_key) {
          const name = parsed.file_name || "file";
          const path = await this.downloadResource(
            msg.message_id,
            parsed.file_key,
            "file",
            name,
          );
          if (path) files.push({ path, name, type: "file" });
        }
        break;
      }

      default:
        text = `[Unsupported message type: ${msgType}]`;
    }

    if (!text && files.length === 0) return;

    this.onMessage({ channel: "feishu", chatId, senderId, content: text, files });
  }

  // ── Post content extraction ──────────────────────────────

  private extractPostText(post: any): string {
    const parts: string[] = [];
    // Try zh_cn first, then en_us, then first available
    const lang = post.zh_cn || post.en_us || Object.values(post)[0] as any;
    if (!lang) return "";

    if (lang.title) parts.push(lang.title);
    if (Array.isArray(lang.content)) {
      for (const line of lang.content) {
        if (!Array.isArray(line)) continue;
        const lineText = line
          .filter((el: any) => el.tag === "text" || el.tag === "a")
          .map((el: any) => el.text || el.href || "")
          .join("");
        if (lineText) parts.push(lineText);
      }
    }
    return parts.join("\n");
  }

  // ── Media helpers ────────────────────────────────────────

  private async downloadResource(
    messageId: string,
    fileKey: string,
    type: "image" | "file",
    fileName: string,
  ): Promise<string | null> {
    try {
      if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
      const outPath = join(this.dataDir, `${Date.now()}_${fileName}`);

      const resp = await this.client.im.messageResource.get({
        path: { message_id: messageId, file_key: fileKey },
        params: { type },
      });

      if (resp && typeof resp === "object" && "writeFile" in resp) {
        await (resp as any).writeFile(outPath);
        return outPath;
      }

      // Fallback: resp may be a Buffer
      if (Buffer.isBuffer(resp)) {
        await Bun.write(outPath, resp);
        return outPath;
      }

      return null;
    } catch (e) {
      console.error(`  [feishu] download ${type} failed:`, e);
      return null;
    }
  }

  private async uploadImage(imagePath: string): Promise<string | null> {
    try {
      const resp = await this.client.im.image.create({
        data: {
          image_type: "message",
          image: createReadStream(imagePath),
        },
      });
      return (resp as any)?.image_key || null;
    } catch (e) {
      console.error("  [feishu] upload image failed:", e);
      return null;
    }
  }

  private async uploadFile(
    filePath: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      type FileType = "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream";
      const typeMap: Record<string, FileType> = {
        opus: "opus", mp4: "mp4", pdf: "pdf",
        doc: "doc", docx: "doc", xls: "xls", xlsx: "xls",
        ppt: "ppt", pptx: "ppt",
      };

      const resp = await this.client.im.file.create({
        data: {
          file_type: (typeMap[ext] || "stream") as FileType,
          file_name: fileName,
          file: createReadStream(filePath),
        },
      });
      return (resp as any)?.file_key || null;
    } catch (e) {
      console.error("  [feishu] upload file failed:", e);
      return null;
    }
  }

  // ── Reaction ──────────────────────────────────────────────

  private addReaction(messageId: string): void {
    const emojis = [
      "THUMBSUP", "OnIt", "GLANCE", "THINKING",
      "FISTBUMP", "StatusFlashOfInspiration", "OneSecond", "VRHeadset",
    ];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    this.client.im.messageReaction.create({
      path: { message_id: messageId },
      data: { reaction_type: { emoji_type: emoji } },
    }).catch(() => {}); // fire-and-forget
  }

  // ── Helpers ──────────────────────────────────────────────

  private receiveIdType(id: string): "chat_id" | "open_id" {
    return id.startsWith("oc_") ? "chat_id" : "open_id";
  }
}
