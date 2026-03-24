import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { type Config, loadConfig, saveConfig } from "./config";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  saveSession,
} from "./session";
import { createAgentRunner } from "./agent";
import { createRegistry } from "./tools";

// ── File tree ─────────────────────────────────────────────────

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
}

const IGNORE = new Set([
  "node_modules", ".git", "dist", ".next", "__pycache__",
  ".DS_Store", ".env", "bun.lock", "package-lock.json",
  ".cache", ".vscode", ".idea",
  "sessions", "config.json", "SOUL.md",
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
    if (IGNORE.has(e.name) || e.name.startsWith(".")) continue;
    const path = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      result.push({ name: e.name, path, type: "directory", children: await listDir(join(dir, e.name), path, depth + 1) });
    } else {
      result.push({ name: e.name, path, type: "file" });
    }
  }
  return result;
}

// ── Server ────────────────────────────────────────────────────

export function createServer(config: Config, workDir: string) {
  const app = new Hono();
  const registry = createRegistry();
  const runAgent = createAgentRunner(config, registry);

  app.use("*", cors());

  // Discovery
  app.get("/api/health", (c) =>
    c.json({ status: "ok", name: "UniSpace", version: "0.2.0", workDir }),
  );

  // Config
  app.get("/api/config", (c) => {
    const cfg = loadConfig();
    // Mask API key for display (show last 4 chars)
    const masked = { ...cfg, model: { ...cfg.model } };
    return c.json(masked);
  });

  app.put("/api/config", async (c) => {
    const body = await c.req.json();
    saveConfig(body);
    return c.json({ ok: true });
  });

  // Files
  app.get("/api/files", async (c) => c.json(await listDir(workDir)));

  app.get("/api/files/read", async (c) => {
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
    const { path: p, content } = await c.req.json();
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    await Bun.write(full, content);
    return c.json({ ok: true });
  });

  app.delete("/api/files/delete", async (c) => {
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
    const p = c.req.query("path");
    if (!p) return c.json({ error: "path required" }, 400);
    const full = resolve(workDir, p);
    if (!full.startsWith(resolve(workDir) + "/"))
      return c.json({ error: "Forbidden" }, 403);
    const file = Bun.file(full);
    if (!(await file.exists())) return c.json({ error: "Not found" }, 404);
    return new Response(file);
  });

  // Sessions
  app.post("/api/sessions", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const s = createSession(body.workDir || workDir);
    return c.json({ id: s.id, workDir: s.workDir, createdAt: s.createdAt });
  });

  app.get("/api/sessions", (c) =>
    c.json(
      listSessions().map((s) => ({
        id: s.id,
        workDir: s.workDir,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        title: s.title,
        messageCount: s.messages.length,
      })),
    ),
  );

  app.get("/api/sessions/:id", (c) => {
    const s = getSession(c.req.param("id"));
    if (!s) return c.json({ error: "Not found" }, 404);
    return c.json({
      id: s.id,
      workDir: s.workDir,
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

  // Get message history
  app.get("/api/sessions/:id/messages", (c) => {
    const s = getSession(c.req.param("id"));
    if (!s) return c.json({ error: "Not found" }, 404);
    return c.json(s.messages);
  });

  // Send message → SSE stream
  app.post("/api/sessions/:id/messages", async (c) => {
    const session = getSession(c.req.param("id"));
    if (!session) return c.json({ error: "Session not found" }, 404);

    const { content } = await c.req.json();
    if (!content) return c.json({ error: "content required" }, 400);

    session.messages.push({ role: "user", content });

    return streamSSE(c, async (stream) => {
      const ac = new AbortController();
      c.req.raw.signal.addEventListener("abort", () => ac.abort());

      const ctx = { workDir: session.workDir, taskStore: session.tasks };

      for await (const event of runAgent(session.messages, ctx, ac.signal)) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      }

      // Persist after agent completes
      saveSession(session);
    });
  });

  return app;
}
