import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { listProjects, projectExists, projectDir, getProjectById } from "./config";
import type { AgentEvent } from "./agent";

// ── Display types ─────────────────────────────────────────────
// These match the shape the frontend's store expects, so sessions
// persist in the same format they render in.

export interface MessagePart {
  type: "text" | "thinking" | "tool_call";
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
}

export interface Session {
  id: string;
  projectId: string;
  /** @deprecated — old sessions may still have this. Use projectId. */
  projectName?: string;
  /** SDK session id, assigned after the first agent turn. Used for resume. */
  sdkSessionId?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  channelKey?: string;
}

// ── In-memory store ───────────────────────────────────────────

const sessions = new Map<string, Session>();

// ── Persistence (one JSON file per session) ──────────────────

function sessionsDir(projectId: string): string {
  return join(projectDir(projectId), "sessions");
}

function sessionPath(s: Session): string {
  return join(sessionsDir(s.projectId), `${s.id}.json`);
}

export function saveSession(session: Session): void {
  if (!sessions.has(session.id)) return;
  session.updatedAt = Date.now();
  const dir = sessionsDir(session.projectId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(sessionPath(session), JSON.stringify(session, null, 2));
}

export function loadAllSessions(): void {
  sessions.clear();
  for (const proj of listProjects()) {
    const dir = join(proj.path, "sessions");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const s: Session = JSON.parse(raw);
        // Backward compat: migrate old projectName → projectId
        if (!s.projectId && (s as any).projectName) {
          s.projectId = proj.id;
          delete (s as any).projectName;
        }
        if (!s.projectId) s.projectId = proj.id;
        sessions.set(s.id, s);
      } catch (e) {
        console.error(`  Failed to load session ${file}:`, e);
      }
    }
  }
  console.log(`  Loaded ${sessions.size} session(s)`);
}

// ── CRUD ──────────────────────────────────────────────────────

export function createSession(projectId: string): Session {
  if (!getProjectById(projectId)) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const session: Session = {
    id: crypto.randomUUID(),
    projectId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  sessions.set(session.id, session);
  saveSession(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function listSessions(projectId?: string): Session[] {
  const all = [...sessions.values()];
  const filtered = projectId
    ? all.filter((s) => s.projectId === projectId)
    : all;
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findSessionByChannelKey(key: string): Session | undefined {
  for (const s of sessions.values()) {
    if (s.channelKey === key) return s;
  }
  return undefined;
}

export function deleteSession(id: string): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  sessions.delete(id);
  const p = sessionPath(s);
  if (existsSync(p)) {
    try {
      unlinkSync(p);
    } catch {}
  }
  return true;
}

// ── Event → ChatMessage applicator ───────────────────────────
// Consumes AgentEvents from a streaming runAgent call and folds them into
// the given assistant ChatMessage (merging consecutive deltas into parts
// and attaching tool_result outputs to matching tool_call parts). Also
// captures the SDK session id on the session for resume.

export function applyAgentEvent(
  event: AgentEvent,
  msg: ChatMessage,
  session: Session,
): void {
  switch (event.type) {
    case "session_id":
      session.sdkSessionId = event.id;
      break;
    case "text_delta": {
      const last = msg.parts[msg.parts.length - 1];
      if (last && last.type === "text") {
        last.content = (last.content ?? "") + event.content;
      } else {
        msg.parts.push({ type: "text", content: event.content });
      }
      break;
    }
    case "thinking_delta": {
      const last = msg.parts[msg.parts.length - 1];
      if (last && last.type === "thinking") {
        last.content = (last.content ?? "") + event.content;
      } else {
        msg.parts.push({ type: "thinking", content: event.content });
      }
      break;
    }
    case "tool_call":
      msg.parts.push({
        type: "tool_call",
        id: event.id,
        name: event.name,
        input: event.input,
      });
      break;
    case "tool_result": {
      for (let i = msg.parts.length - 1; i >= 0; i--) {
        const p = msg.parts[i];
        if (p.type === "tool_call" && p.id === event.id) {
          p.output = event.content;
          p.isError = event.is_error;
          break;
        }
      }
      break;
    }
  }
}
