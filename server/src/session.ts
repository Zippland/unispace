import type OpenAI from "openai";
import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { paths } from "./config";
import { TaskStore, type Task } from "./tools/task";

// ── Types ─────────────────────────────────────────────────────

export interface Session {
  id: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  workDir: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
  channelKey?: string;
  tasks: TaskStore;
}

interface SessionMeta {
  id: string;
  workDir: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
  channelKey?: string;
  tasks?: Task[];
}

// ── In-memory store ───────────────────────────────────────────

const sessions = new Map<string, Session>();

// ── Persistence (JSONL) ───────────────────────────────────────

function sessionPath(id: string): string {
  return join(paths.sessions(), `${id}.jsonl`);
}

export function saveSession(session: Session): void {
  if (!sessions.has(session.id)) return; // already deleted
  session.updatedAt = Date.now();
  const meta: SessionMeta = {
    id: session.id,
    workDir: session.workDir,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    title: session.title,
    channelKey: session.channelKey,
    tasks: session.tasks.dump(),
  };
  const lines = [JSON.stringify(meta)];
  for (const msg of session.messages) lines.push(JSON.stringify(msg));
  writeFileSync(sessionPath(session.id), lines.join("\n") + "\n");
}

export function loadAllSessions(): void {
  const dir = paths.sessions();
  if (!existsSync(dir)) return;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;
    try {
      const raw = readFileSync(join(dir, file), "utf-8")
        .split("\n")
        .filter(Boolean);
      if (raw.length === 0) continue;

      const meta: SessionMeta = JSON.parse(raw[0]);
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      for (let i = 1; i < raw.length; i++) messages.push(JSON.parse(raw[i]));

      const tasks = new TaskStore();
      if (meta.tasks) tasks.restore(meta.tasks);

      sessions.set(meta.id, {
        id: meta.id,
        messages,
        workDir: meta.workDir,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt || meta.createdAt,
        title: meta.title,
        channelKey: meta.channelKey,
        tasks,
      });
    } catch (e) {
      console.error(`  Failed to load session ${file}:`, e);
    }
  }
  console.log(`  Loaded ${sessions.size} session(s)`);
}

// ── CRUD ──────────────────────────────────────────────────────

export function createSession(workDir: string): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    messages: [],
    workDir,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tasks: new TaskStore(),
  };
  sessions.set(session.id, session);
  saveSession(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function listSessions(): Session[] {
  return [...sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findSessionByChannelKey(key: string): Session | undefined {
  for (const s of sessions.values()) {
    if (s.channelKey === key) return s;
  }
  return undefined;
}

export function deleteSession(id: string): boolean {
  if (!sessions.delete(id)) return false;
  const p = sessionPath(id);
  if (existsSync(p)) unlinkSync(p);
  return true;
}
