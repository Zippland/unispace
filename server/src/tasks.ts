// ═══════════════════════════════════════════════════════════════
//  Tasks — project-scoped preset workflows the agent can execute
//  on demand.
//
//  A task = prompt + trigger declaration + light metadata. Stored
//  as plain markdown with YAML-ish frontmatter at
//  `<project>/.claude/tasks/<name>.md`. The file format intentionally
//  mirrors `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` so
//  everything in the project is a grep-able, git-push-able file.
//
//  First-principles split:
//    • file stores "what to do + when the user SAYS it should run"
//    • the server's POST /api/tasks/:name/run endpoint "does" it
//    • there is NO scheduler process — the `trigger` field is a
//      declaration of intent for observers, not a runtime hook.
//      This is deliberate: the demo surfaces all three trigger
//      types (manual / fixed cron / model-scheduled) to communicate
//      the product shape, but only manual invocation actually fires.
// ═══════════════════════════════════════════════════════════════

import { readdir, mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// ── Types ────────────────────────────────────────────────────

export type TaskTrigger = "manual" | "fixed" | "model";
export type TaskContinuation = "new" | "append";

export interface TaskFile {
  /** Filename slug (no extension, no slashes) */
  name: string;
  description: string;
  trigger: TaskTrigger;
  /** Cron expression — only meaningful when trigger === "fixed" */
  schedule?: string;
  continuation?: TaskContinuation;
  last_run_at?: string;
  last_session_id?: string;
  /** Prompt body — everything below the frontmatter block */
  body: string;
}

// ── Paths ────────────────────────────────────────────────────

function tasksDir(projectDir: string): string {
  return join(projectDir, ".claude", "tasks");
}

function taskPath(projectDir: string, name: string): string {
  return join(tasksDir(projectDir), `${name}.md`);
}

function sanitizeName(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  if (!slug) throw new Error("Task name must contain at least one [a-z0-9]");
  return slug;
}

// ── Frontmatter (minimal YAML) ───────────────────────────────

// Intentionally self-contained: one-line `key: value` pairs, values
// are plain strings, no nested structures, no quoting dance. This
// matches what `server/src/server.ts`'s own `parseFrontmatter` does
// for agents and commands.

function parseFrontmatter(text: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

function stringifyFrontmatter(task: TaskFile): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${task.name}`);
  lines.push(`description: ${sanitizeOneLine(task.description)}`);
  lines.push(`trigger: ${task.trigger}`);
  if (task.schedule) lines.push(`schedule: ${sanitizeOneLine(task.schedule)}`);
  if (task.continuation) lines.push(`continuation: ${task.continuation}`);
  if (task.last_run_at) lines.push(`last_run_at: ${task.last_run_at}`);
  if (task.last_session_id)
    lines.push(`last_session_id: ${task.last_session_id}`);
  lines.push("---");
  lines.push("");
  lines.push(task.body.trimStart());
  if (!lines[lines.length - 1].endsWith("\n")) lines.push("");
  return lines.join("\n");
}

function sanitizeOneLine(s: string): string {
  return (s || "").replace(/[\r\n]+/g, " ").trim();
}

// ── Loader ───────────────────────────────────────────────────

async function readTaskFile(
  projectDir: string,
  filename: string,
): Promise<TaskFile | null> {
  const safe = filename.replace(/\.md$/i, "");
  if (!/^[a-z0-9_-]+$/i.test(safe)) return null;
  const path = taskPath(projectDir, safe);
  if (!existsSync(path)) return null;
  try {
    const raw = await Bun.file(path).text();
    const { meta, body } = parseFrontmatter(raw);
    const trigger = (meta.trigger || "manual") as TaskTrigger;
    return {
      name: meta.name || safe,
      description: meta.description || "",
      trigger:
        trigger === "fixed" || trigger === "model" ? trigger : "manual",
      schedule: meta.schedule || undefined,
      continuation:
        (meta.continuation as TaskContinuation | undefined) || undefined,
      last_run_at: meta.last_run_at || undefined,
      last_session_id: meta.last_session_id || undefined,
      body: body.trim(),
    };
  } catch {
    return null;
  }
}

export async function listTasks(projectDir: string): Promise<TaskFile[]> {
  const dir = tasksDir(projectDir);
  if (!existsSync(dir)) return [];
  const out: TaskFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const task = await readTaskFile(projectDir, entry.name);
    if (task) out.push(task);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTask(
  projectDir: string,
  name: string,
): Promise<TaskFile | null> {
  return readTaskFile(projectDir, `${sanitizeName(name)}.md`);
}

// ── CRUD ─────────────────────────────────────────────────────

export interface SaveTaskInput {
  name: string;
  description?: string;
  trigger?: TaskTrigger;
  schedule?: string;
  continuation?: TaskContinuation;
  body: string;
}

export async function saveTask(
  projectDir: string,
  input: SaveTaskInput,
): Promise<TaskFile> {
  const name = sanitizeName(input.name);
  const existing = await readTaskFile(projectDir, `${name}.md`);
  const task: TaskFile = {
    name,
    description: input.description ?? existing?.description ?? "",
    trigger: input.trigger ?? existing?.trigger ?? "manual",
    schedule: input.schedule ?? existing?.schedule,
    continuation: input.continuation ?? existing?.continuation,
    last_run_at: existing?.last_run_at,
    last_session_id: existing?.last_session_id,
    body: input.body,
  };
  const dir = tasksDir(projectDir);
  await mkdir(dir, { recursive: true });
  await writeFile(taskPath(projectDir, name), stringifyFrontmatter(task), "utf-8");
  return task;
}

export async function deleteTask(
  projectDir: string,
  name: string,
): Promise<void> {
  const safe = sanitizeName(name);
  const path = taskPath(projectDir, safe);
  if (existsSync(path)) await rm(path);
}

/**
 * Stamp a task's frontmatter with the session it was last run against.
 * Called after a `POST /api/tasks/:name/run` so the panel can show
 * "last run 12 minutes ago → session xyz".
 */
export async function recordTaskRun(
  projectDir: string,
  name: string,
  sessionId: string,
): Promise<void> {
  const task = await readTaskFile(projectDir, `${sanitizeName(name)}.md`);
  if (!task) return;
  task.last_run_at = new Date().toISOString();
  task.last_session_id = sessionId;
  await writeFile(
    taskPath(projectDir, task.name),
    stringifyFrontmatter(task),
    "utf-8",
  );
}

// ── Prompt composition for task runs ─────────────────────────

/**
 * Build the user-message content that gets sent into a session
 * when a task is manually run. Includes a compact header so the
 * agent (and the chat transcript reader) can tell this turn came
 * from a task rather than a typed message.
 */
export function composeTaskPrompt(task: TaskFile): string {
  const header = `[Scheduled task: ${task.name} · trigger=${task.trigger}${
    task.schedule ? ` · schedule="${task.schedule}"` : ""
  }${task.trigger === "model" ? " · (model self-schedule preview — demo runs on manual trigger)" : ""} · triggered ${new Date().toISOString()}]`;
  return `${header}\n\n${task.body}`;
}
