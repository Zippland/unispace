import { create } from "zustand";

// ── File types ────────────────────────────────────────────────

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
  updatedAt?: number;
  channel?: string;
}

export type FileType = "image" | "markdown" | "code" | "csv" | "json" | "text";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"]);
const CODE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java",
  "c", "cpp", "h", "hpp", "cs", "rb", "php", "lua", "swift", "kt",
  "css", "scss", "less", "html", "xml", "yaml", "yml", "toml", "ini",
  "sh", "bash", "zsh", "sql", "graphql", "proto", "makefile", "dockerfile",
]);

export function getFileType(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const base = name.toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  if (CODE_EXTS.has(ext) || CODE_EXTS.has(base)) return "code";
  return "text";
}

// ── Message types ─────────────────────────────────────────────

export interface MessagePart {
  type: "text" | "tool_call" | "thinking";
  content?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  output?: string;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  files?: {
    path: string;
    name: string;
    kind?: "file" | "skill" | "command" | "task" | "datasource";
  }[];
}

export interface SessionInfo {
  id: string;
  createdAt: number;
  title?: string;
  channel?: string;
  messageCount: number;
  projectName?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  updatedAt: number;
}

// ── File tab ──────────────────────────────────────────────────

export interface FileTab {
  path: string;
  name: string;
  type: FileType;
  content?: string;
  loading?: boolean;
}

// ── Store ─────────────────────────────────────────────────────

interface Store {
  serverUrl: string;
  connected: boolean;
  workDir: string;

  projects: ProjectInfo[];
  currentProject: string;

  sessions: SessionInfo[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  streaming: boolean;

  files: FileEntry[];

  openTabs: FileTab[];
  activeTab: string | null; // null = chat

  // Active subagent — its definition from `.claude/agents/<name>.md` is
  // programmatically registered with the SDK for the next message(s).
  // In-memory only; cleared on reload.
  activeAgent: { name: string; description?: string } | null;

  // Connection
  setConnection: (ok: boolean, url?: string, dir?: string) => void;

  // Projects
  setProjects: (projects: ProjectInfo[], current: string) => void;
  setCurrentProject: (name: string) => void;

  // Sessions
  setSessions: (s: SessionInfo[]) => void;
  addSession: (s: SessionInfo) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  // Messages
  setSessionMessages: (sid: string, msgs: ChatMessage[]) => void;
  appendMessage: (sid: string, msg: ChatMessage) => void;
  updateMessage: (sid: string, mid: string, fn: (p: MessagePart[]) => MessagePart[]) => void;
  setStreaming: (v: boolean) => void;

  // Files
  setFiles: (f: FileEntry[]) => void;

  // Tabs
  openFile: (path: string, name: string) => void;
  closeFile: (path: string) => void;
  setActiveTab: (tab: string | null) => void;
  setFileContent: (path: string, content: string) => void;

  // Active subagent
  setActiveAgent: (agent: { name: string; description?: string } | null) => void;
}

export const useStore = create<Store>((set) => ({
  serverUrl: "http://localhost:3210",
  connected: false,
  workDir: "",
  projects: [],
  currentProject: "",
  sessions: [],
  activeSessionId: null,
  messages: {},
  streaming: false,
  files: [],
  openTabs: [],
  activeTab: null,
  activeAgent: null,

  setConnection: (ok, url, dir) =>
    set((s) => ({
      connected: ok,
      ...(url !== undefined && { serverUrl: url }),
      ...(dir !== undefined && { workDir: dir }),
    })),

  setProjects: (projects, current) => set({ projects, currentProject: current }),
  setCurrentProject: (name) => set({ currentProject: name }),

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  removeSession: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.messages;
      return {
        sessions: s.sessions.filter((x) => x.id !== id),
        activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        messages: rest,
      };
    }),
  setActiveSession: (id) => set({ activeSessionId: id }),

  setSessionMessages: (sid, msgs) =>
    set((s) => ({ messages: { ...s.messages, [sid]: msgs } })),

  appendMessage: (sid, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sid]: [...(s.messages[sid] || []), msg],
      },
    })),
  updateMessage: (sid, mid, fn) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sid]: (s.messages[sid] || []).map((m) =>
          m.id === mid ? { ...m, parts: fn(m.parts) } : m,
        ),
      },
    })),
  setStreaming: (streaming) => set({ streaming }),

  setFiles: (files) => set({ files }),

  // ── Tabs ──────────────────────────────────────────────────

  openFile: (path, name) =>
    set((s) => {
      if (s.openTabs.some((t) => t.path === path))
        return { activeTab: path };
      const type = getFileType(name);
      const tab: FileTab = { path, name, type, loading: type !== "image" };
      return { openTabs: [...s.openTabs, tab], activeTab: path };
    }),

  closeFile: (path) =>
    set((s) => {
      const tabs = s.openTabs.filter((t) => t.path !== path);
      const active =
        s.activeTab === path
          ? tabs.length > 0
            ? tabs[tabs.length - 1].path
            : null
          : s.activeTab;
      return { openTabs: tabs, activeTab: active };
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFileContent: (path, content) =>
    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.path === path ? { ...t, content, loading: false } : t,
      ),
    })),

  setActiveAgent: (agent) => set({ activeAgent: agent }),
}));
