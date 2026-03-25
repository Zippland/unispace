// ── Channel abstraction ──────────────────────────────────────

export interface InboundMessage {
  channel: string;
  chatId: string;
  senderId: string;
  content: string;
  files?: { path: string; name: string; type: "image" | "file" }[];
}

export interface Channel {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendText(chatId: string, text: string): Promise<void>;
  sendImage(chatId: string, imagePath: string): Promise<void>;
  sendFile(chatId: string, filePath: string, fileName: string): Promise<void>;
}

// ── Channel config (channels.json) ──────────────────────────

export interface FeishuChannelConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export interface ChannelsConfig {
  feishu?: FeishuChannelConfig;
}
