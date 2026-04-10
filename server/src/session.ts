import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { paths, listProjects, projectExists } from "./config";

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
  projectName: string;
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

function sessionPath(s: Session): string {
  return join(paths.projectSessions(s.projectName), `${s.id}.json`);
}

export function saveSession(session: Session): void {
  if (!sessions.has(session.id)) return;
  session.updatedAt = Date.now();
  const dir = paths.projectSessions(session.projectName);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(sessionPath(session), JSON.stringify(session, null, 2));
}

export function loadAllSessions(): void {
  sessions.clear();
  for (const proj of listProjects()) {
    const dir = paths.projectSessions(proj.name);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = readFileSync(join(dir, file), "utf-8");
        const s: Session = JSON.parse(raw);
        sessions.set(s.id, s);
      } catch (e) {
        console.error(`  Failed to load session ${file}:`, e);
      }
    }
  }
  console.log(`  Loaded ${sessions.size} session(s)`);
}

// ── CRUD ──────────────────────────────────────────────────────

export function createSession(projectName: string): Session {
  if (!projectExists(projectName)) {
    throw new Error(`Project not found: ${projectName}`);
  }
  const session: Session = {
    id: crypto.randomUUID(),
    projectName,
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

export function listSessions(projectName?: string): Session[] {
  const all = [...sessions.values()];
  const filtered = projectName
    ? all.filter((s) => s.projectName === projectName)
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
