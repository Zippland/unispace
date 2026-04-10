import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import {
  type Config,
  loadConfig,
  saveConfig,
  paths,
  listProjects,
  projectExists,
  cloneProject,
} from "./config";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  saveSession,
  type ChatMessage,
  type Session,
} from "./session";
import { runAgent, type AgentEvent } from "./agent";

// ── File tree ─────────────────────────────────────────────────

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
  updatedAt?: number;
}

const IGNORE = new Set([
  "node_modules", ".git", "dist", ".next", "__pycache__",
  ".DS_Store", ".env", "bun.lock", "package-lock.json",
  ".cache", ".vscode", ".idea",
]);

async function listDir(dir: string, base = "", depth = 0): Promise<FileEntry[]> {
  if (depth > 5) return [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const result: FileEntry[] = [];
  for (const e of sorted) {
    if (IGNORE.has(e.name)) continue;
    // Allow .claude (skills) but skip other dotfiles
    if (e.name.startsWith(".") && e.name !== ".claude") continue;
    const path = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      result.push({
        name: e.name,
        path,
        type: "directory",
        children: await listDir(join(dir, e.name), path, depth + 1),
      });
    } else {
      result.push({ name: e.name, path, type: "file" });
    }
  }
  return result;
}

// ── Current project dir helper ───────────────────────────────

function currentProjectDir(): string {
  const cfg = loadConfig();
  return paths.project(cfg.currentProject);
}

// ── Apply streamed agent events onto the assistant ChatMessage ─

function applyEvent(event: AgentEvent, msg: ChatMessage, session: Session) {
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

// ── Server ────────────────────────────────────────────────────

export function createServer(_initialConfig: Config) {
  const app = new Hono();

  app.use("*", cors());

  // Health — returns the current project's path as workDir
  app.get("/api/health", (c) => {
    const cfg = loadConfig();
    return c.json({
      status: "ok",
      name: "UniSpace",
      version: "0.3.0",
      currentProject: cfg.currentProject,
      workDir: paths.project(cfg.currentProject),
    });
  });

  // ── Config ────────────────────────────────────────────────
  app.get("/api/config", (c) => c.json(loadConfig()));

  app.put("/api/config", async (c) => {
    const body = await c.req.json();
    saveConfig(body);
    return c.json({ ok: true });
  });

  // ── Projects ──────────────────────────────────────────────
  app.get("/api/projects", (c) => {
    const cfg = loadConfig();
    return c.json({
      current: cfg.currentProject,
      projects: listProjects(),
    });
  });

  app.post("/api/projects", async (c) => {
    const { from, to } = await c.req.json();
    if (!from || !to) return c.json({ error: "from and to required" }, 400);
    try {
      cloneProject(from, to);
      return c.json({ ok: true, name: to });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.put("/api/projects/current", async (c) => {
    const { name } = await c.req.json();
    if (!name || !projectExists(name)) {
      return c.json({ error: "Project not found" }, 404);
    }
    const cfg = loadConfig();
    cfg.currentProject = name;
    saveConfig(cfg);
    return c.json({ ok: true, current: name });
  });

  // ── Files (scoped to current project) ────────────────────
  app.get("/api/files", async (c) => {
    const dir = currentProjectDir();
    const tree = await listDir(dir);
    // Enrich sessions directory: replace raw filenames with session titles
    const sessDir = tree.find((e) => e.name === "sessions" && e.type === "directory");
    if (sessDir?.children) {
      const cfg = loadConfig();
      const allSessions = listSessions(cfg.currentProject);
      sessDir.children = allSessions.map((s) => ({
        name: s.title || s.id.slice(0, 8),
        path: `sessions/${s.id}.json`,
        type: "file" as const,
        updatedAt: s.updatedAt,
      }));
    }
    return c.json(tree);
  });

  app.post("/api/files/upload", async (c) => {
    const workDir = currentProjectDir();
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "file required" }, 400);

    const subdir = (formData.get("path") as string) || "";
    const targetDir = subdir ? resolve(workDir, subdir) : workDir;
    if (!targetDir.startsWith(resolve(workDir)))
      return c.json({ error: "Forbidden" }, 403);

    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    const fullPath = resolve(targetDir, file.name);
    await Bun.write(fullPath, await file.arrayBuffer());

    const relPath = fullPath.slice(resolve(workDir).length + 1);
    return c.json({ ok: true, name: file.name, path: relPath });
  });

  app.get("/api/files/read", async (c) => {
    const workDir = currentProjectDir();
    const p = c.req.query("path");
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    try {
      return c.text(await Bun.file(full).text());
    } catch {
      return c.json({ error: "Not found" }, 404);
    }
  });

  app.put("/api/files/write", async (c) => {
    const workDir = currentProjectDir();
    const { path: p, content } = await c.req.json();
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    await Bun.write(full, content);
    return c.json({ ok: true });
  });

  app.delete("/api/files/delete", async (c) => {
    const workDir = currentProjectDir();
    const p = c.req.query("path");
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    const { unlinkSync } = await import("fs");
    try {
      unlinkSync(full);
      return c.json({ ok: true });
    } catch {
      return c.json({ error: "Not found" }, 404);
    }
  });

  app.get("/api/files/raw", async (c) => {
    const workDir = currentProjectDir();
    const p = c.req.query("path");
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    const file = Bun.file(full);
    if (!(await file.exists())) return c.json({ error: "Not found" }, 404);
    return new Response(file);
  });

  // ── Sessions (scoped to current project) ─────────────────
  app.post("/api/sessions", async (c) => {
    const cfg = loadConfig();
    const body = await c.req.json().catch(() => ({}));
    const projectName = body.project || cfg.currentProject;
    try {
      const s = createSession(projectName);
      return c.json({
        id: s.id,
        projectName: s.projectName,
        createdAt: s.createdAt,
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.get("/api/sessions", (c) => {
    const cfg = loadConfig();
    const scope = c.req.query("project") ?? cfg.currentProject;
    return c.json(
      listSessions(scope).map((s) => ({
        id: s.id,
        projectName: s.projectName,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        title: s.title,
        messageCount: s.messages.length,
      })),
    );
  });

  app.get("/api/sessions/:id", (c) => {
    const s = getSession(c.req.param("id"));
    if (!s) return c.json({ error: "Not found" }, 404);
    return c.json({
      id: s.id,
      projectName: s.projectName,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      title: s.title,
      messageCount: s.messages.length,
    });
  });

  app.delete("/api/sessions/:id", (c) => {
    if (!deleteSession(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  });

  // Get message history as ChatMessage[] (already in display format)
  app.get("/api/sessions/:id/messages", (c) => {
    const s = getSession(c.req.param("id"));
    if (!s) return c.json({ error: "Not found" }, 404);
    return c.json(s.messages);
  });

  // Send message → SSE stream of agent events
  app.post("/api/sessions/:id/messages", async (c) => {
    const session = getSession(c.req.param("id"));
    if (!session) return c.json({ error: "Session not found" }, 404);

    const { content } = await c.req.json();
    if (!content) return c.json({ error: "content required" }, 400);

    // Auto-title from first user message
    if (!session.title) {
      const t = content.replace(/^\[Attached files:[^\]]*\]\s*/s, "").trim() || content;
      session.title = t.length > 40 ? t.slice(0, 40) + "..." : t;
    }

    // Append user message
    session.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", content }],
    });

    // Assistant message accumulates as events stream in
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [],
    };
    session.messages.push(assistantMsg);

    return streamSSE(c, async (stream) => {
      const ac = new AbortController();
      c.req.raw.signal.addEventListener("abort", () => ac.abort());

      const cfg = loadConfig();
      const projectDir = paths.project(session.projectName);

      for await (const event of runAgent({
        prompt: content,
        cwd: projectDir,
        config: cfg,
        resumeSessionId: session.sdkSessionId,
        signal: ac.signal,
      })) {
        applyEvent(event, assistantMsg, session);
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      }

      saveSession(session);
    });
  });

  return app;
}
