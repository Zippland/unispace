import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import {
  type Config,
  loadConfig,
  saveConfig,
  loadChannelsConfig,
  saveChannelsConfig,
  paths,
  listProjects,
  projectExists,
  cloneProject,
  createBlankProject,
  deleteProject,
  listTemplates,
  createProjectFromTemplate,
  readProjectSettings,
  writeProjectSettings,
} from "./config";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  saveSession,
  applyAgentEvent,
  type ChatMessage,
} from "./session";
import { runAgent } from "./agent";

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

/** Parse a simple `key: value` YAML frontmatter block from a markdown file.
 *  Does NOT support nested keys, multiline values, or quoted strings —
 *  sufficient for agent metadata (name, description). */
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

// ── Slash-command expansion ───────────────────────────────────
// Mirrors Claude Code's slash-command semantics: a `/name` token at
// a word boundary is replaced by the body of `.claude/commands/<name>.md`
// in the project. The args following the command on the same line are
// substituted into `$ARGUMENTS` if the body uses it, otherwise appended
// after the body. Tokens that don't resolve to a real file are left as
// literal text — so accidental slashes don't break user input.

async function expandSlashCommands(
  text: string,
  projectDir: string,
): Promise<string> {
  if (!text || text.indexOf("/") < 0) return text;
  const projectRoot = resolve(projectDir);
  const cache = new Map<string, string | null>();

  async function lookup(name: string): Promise<string | null> {
    if (cache.has(name)) return cache.get(name)!;
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safe) {
      cache.set(name, null);
      return null;
    }
    try {
      const filePath = resolve(projectRoot, `.claude/commands/${safe}.md`);
      if (!filePath.startsWith(projectRoot + "/")) {
        cache.set(name, null);
        return null;
      }
      const raw = await Bun.file(filePath).text();
      const { body } = parseFrontmatter(raw);
      const trimmed = body.trim();
      cache.set(name, trimmed || null);
      return trimmed || null;
    } catch {
      cache.set(name, null);
      return null;
    }
  }

  const cmdRegex = /(^|\s)\/([a-zA-Z0-9_-]+)([^\n]*)/g;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = cmdRegex.exec(text)) !== null) matches.push(m);
  if (matches.length === 0) return text;

  await Promise.all(
    Array.from(new Set(matches.map((x) => x[2]))).map(lookup),
  );

  let result = "";
  let lastIdx = 0;
  for (const match of matches) {
    result += text.slice(lastIdx, match.index);
    const leadingWs = match[1];
    const body = cache.get(match[2]);
    const args = (match[3] || "").trim();
    if (body) {
      const expanded = body.includes("$ARGUMENTS")
        ? body.replace(/\$ARGUMENTS/g, args)
        : args
          ? `${body}\n\n${args}`
          : body;
      result += leadingWs + expanded;
    } else {
      // Unresolved /cmd — strip the token but keep any args so the
      // user's actual question isn't lost. Prevents the LLM from
      // misinterpreting a stray slash as a tool call.
      result += leadingWs + args;
    }
    lastIdx = match.index + match[0].length;
  }
  result += text.slice(lastIdx);
  return result;
}

async function listDir(
  dir: string,
  base = "",
  depth = 0,
  showAll = false,
): Promise<FileEntry[]> {
  if (depth > 5) return [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }

  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const result: FileEntry[] = [];
  for (const e of sorted) {
    // .git is noisy and useless regardless of mode — always skip.
    if (e.name === ".git") continue;
    if (!showAll) {
      if (IGNORE.has(e.name)) continue;
      // Allow .claude (skills) but skip other dotfiles
      if (e.name.startsWith(".") && e.name !== ".claude") continue;
    }
    const path = base ? `${base}/${e.name}` : e.name;
    const full = join(dir, e.name);
    let updatedAt = 0;
    try { updatedAt = (await stat(full)).mtimeMs; } catch {}
    if (e.isDirectory()) {
      result.push({
        name: e.name,
        path,
        type: "directory",
        updatedAt,
        children: await listDir(full, path, depth + 1, showAll),
      });
    } else {
      result.push({ name: e.name, path, type: "file", updatedAt });
    }
  }
  return result;
}

// ── Current project dir helper ───────────────────────────────

function currentProjectDir(): string {
  const cfg = loadConfig();
  return paths.project(cfg.currentProject);
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

  // Debug / Inspector — project introspection for the dev panel.
  // Reports only what the server can honestly see on disk + in memory.
  // The SDK owns the real system prompt / tool registry, so we don't
  // pretend to know those.
  app.get("/api/debug/inspect", async (c) => {
    const cfg = loadConfig();
    const projectName = cfg.currentProject;
    const projectDir = paths.project(projectName);

    // CLAUDE.md (project-level system prompt input)
    let claudeMd: string | null = null;
    try {
      claudeMd = await Bun.file(paths.projectClaude(projectName)).text();
    } catch {}

    // .claude/settings.json
    let settings: unknown = null;
    try {
      settings = JSON.parse(
        await Bun.file(paths.projectSettings(projectName)).text(),
      );
    } catch {}

    // .claude/agents/*.md → parse frontmatter + body preview
    const agentsDir = resolve(projectDir, ".claude", "agents");
    const agents: Array<{
      name: string;
      description: string;
      path: string;
      bytes: number;
      preview: string;
    }> = [];
    try {
      const entries = await readdir(agentsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) continue;
        const full = resolve(agentsDir, e.name);
        try {
          const raw = await Bun.file(full).text();
          const { meta, body } = parseFrontmatter(raw);
          const trimmed = body.trim();
          agents.push({
            name: meta.name || e.name.replace(/\.md$/i, ""),
            description: meta.description || "",
            path: `.claude/agents/${e.name}`,
            bytes: raw.length,
            preview: trimmed.slice(0, 240),
          });
        } catch {}
      }
    } catch {}

    // .claude/skills/<name>/SKILL.md → parse each
    const skillsDir = paths.projectSkills(projectName);
    const skills: Array<{
      name: string;
      description: string;
      path: string;
      preview: string;
    }> = [];
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const skillFile = resolve(skillsDir, e.name, "SKILL.md");
        try {
          const raw = await Bun.file(skillFile).text();
          const { meta, body } = parseFrontmatter(raw);
          skills.push({
            name: meta.name || e.name,
            description: meta.description || "",
            path: `.claude/skills/${e.name}/SKILL.md`,
            preview: body.trim().slice(0, 240),
          });
        } catch {}
      }
    } catch {}

    // SDK package version
    let sdkVersion: string | null = null;
    try {
      const pkg = JSON.parse(
        await Bun.file(
          resolve(
            import.meta.dir,
            "..",
            "node_modules",
            "@anthropic-ai",
            "claude-agent-sdk",
            "package.json",
          ),
        ).text(),
      );
      sdkVersion = pkg.version ?? null;
    } catch {}

    // Runtime knobs — mirror what agent.ts actually sets on each query
    const runtime = {
      settingSources: ["project"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      sdkVersion,
    };

    return c.json({
      project: {
        name: projectName,
        path: projectDir,
        sessionCount: listSessions(projectName).length,
      },
      claudeMd,
      settings,
      agents,
      skills,
      runtime,
    });
  });

  // ── Config ────────────────────────────────────────────────
  app.get("/api/config", (c) => c.json(loadConfig()));

  app.put("/api/config", async (c) => {
    const body = await c.req.json();
    saveConfig(body);
    return c.json({ ok: true });
  });

  // ── Channels config (dispatch) ────────────────────────────
  app.get("/api/channels", (c) => c.json(loadChannelsConfig()));

  app.put("/api/channels", async (c) => {
    const body = await c.req.json();
    saveChannelsConfig(body);
    return c.json({ ok: true, note: "Restart server to apply channel changes" });
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

  // ── Project templates (BU-federated gallery) ─────────────
  app.get("/api/templates", (c) => {
    return c.json({ templates: listTemplates() });
  });

  app.post("/api/projects/from-template", async (c) => {
    const { templateId, projectName } = await c.req.json();
    if (!templateId || !projectName) {
      return c.json({ error: "templateId and projectName required" }, 400);
    }
    try {
      createProjectFromTemplate(templateId, projectName);
      return c.json({ ok: true, name: projectName });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.post("/api/projects/blank", async (c) => {
    const { projectName } = await c.req.json();
    if (!projectName) return c.json({ error: "projectName required" }, 400);
    try {
      createBlankProject(projectName);
      return c.json({ ok: true, name: projectName });
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

  app.delete("/api/projects/:name", async (c) => {
    const name = c.req.param("name");
    const cfg = loadConfig();

    // Safety: never delete the project currently in use. Client must
    // switch away first.
    if (name === cfg.currentProject) {
      return c.json(
        { error: "Cannot delete the current project. Switch away first." },
        400,
      );
    }
    // Safety: never leave the user with zero projects.
    if (listProjects().length <= 1) {
      return c.json({ error: "Cannot delete the only remaining project." }, 400);
    }
    if (!projectExists(name)) {
      return c.json({ error: "Project not found" }, 404);
    }

    try {
      // Drop any in-memory sessions tied to this project so the UI stays
      // consistent on next listing.
      for (const s of listSessions(name)) {
        deleteSession(s.id);
      }
      deleteProject(name);
      return c.json({ ok: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  // Per-project settings: model + effort, persisted to .claude/settings.json
  app.get("/api/projects/:name/settings", (c) => {
    const name = c.req.param("name");
    if (!projectExists(name)) return c.json({ error: "Not found" }, 404);
    return c.json(readProjectSettings(name));
  });

  app.put("/api/projects/:name/settings", async (c) => {
    const name = c.req.param("name");
    if (!projectExists(name)) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    writeProjectSettings(name, { model: body.model });
    return c.json({ ok: true, settings: readProjectSettings(name) });
  });

  // ── Files (scoped to current project) ────────────────────
  // `?all=1` returns the raw project tree without dotfile/IGNORE
  // filtering, without session enrichment, and without .claude
  // hoisting — so users can inspect the full on-disk layout.
  app.get("/api/files", async (c) => {
    const dir = currentProjectDir();
    const showAll = c.req.query("all") === "1";
    let tree = await listDir(dir, "", 0, showAll);

    if (showAll) return c.json(tree);

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

    // Hoist .claude/{skills,agents,commands}/ as top-level entries for
    // the UI; paths inside stay as .claude/* so reads still resolve.
    // The raw .claude folder itself is always stripped from the top-level
    // tree — it's an internal config dir and has no user-facing meaning.
    const claudeDir = tree.find((e) => e.name === ".claude" && e.type === "directory");
    const skillsDir = claudeDir?.children?.find(
      (c) => c.name === "skills" && c.type === "directory",
    );
    const agentsDir = claudeDir?.children?.find(
      (c) => c.name === "agents" && c.type === "directory",
    );
    const commandsDir = claudeDir?.children?.find(
      (c) => c.name === "commands" && c.type === "directory",
    );
    tree = tree.filter((e) => e.name !== ".claude");
    if (commandsDir) tree.unshift(commandsDir);
    if (agentsDir) tree.unshift(agentsDir);
    if (skillsDir) tree.unshift(skillsDir);

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

    const { content, agent: requestedAgent } = await c.req.json();
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

    // Load the subagent definition (if any) from `.claude/agents/<name>.md`.
    // The SDK doesn't auto-discover this directory, so we parse frontmatter +
    // body here and pass the result programmatically to runAgent.
    let agentName: string | undefined;
    let agentDefinition: { description: string; prompt: string } | undefined;
    if (typeof requestedAgent === "string" && requestedAgent) {
      const safe = requestedAgent.replace(/[^a-zA-Z0-9-_]/g, "");
      if (safe) {
        try {
          const full = resolve(
            currentProjectDir(),
            `.claude/agents/${safe}.md`,
          );
          if (full.startsWith(resolve(currentProjectDir()) + "/")) {
            const raw = await Bun.file(full).text();
            const { meta, body } = parseFrontmatter(raw);
            const prompt = body.trim();
            if (prompt) {
              agentName = safe;
              agentDefinition = {
                description: meta.description || safe,
                prompt,
              };
            }
          }
        } catch {}
      }
    }

    return streamSSE(c, async (stream) => {
      const ac = new AbortController();
      c.req.raw.signal.addEventListener("abort", () => ac.abort());

      const projectDir = paths.project(session.projectName);

      // Expand `/cmd` slash-command tokens server-side. The original
      // text stays in session.messages so the UI shows what the user
      // typed; only the LLM payload sees the resolved bodies.
      const expandedPrompt = await expandSlashCommands(content, projectDir);

      try {
        for await (const event of runAgent({
          prompt: expandedPrompt,
          cwd: projectDir,
          resumeSessionId: session.sdkSessionId,
          signal: ac.signal,
          agentName,
          agentDefinition,
        })) {
          applyAgentEvent(event, assistantMsg, session);
          try {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
          } catch (writeErr) {
            // Client disconnected mid-stream. Log and stop iterating so
            // the agent can tear down cleanly.
            console.error("  [chat] SSE write failed:", writeErr);
            ac.abort();
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("  [chat] stream failed:", err);
        try {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ type: "error", message: msg }),
          });
          await stream.writeSSE({
            event: "done",
            data: JSON.stringify({ type: "done" }),
          });
        } catch {
          /* client already gone */
        }
      } finally {
        // Persist whatever we have even if the stream was interrupted
        try {
          saveSession(session);
        } catch (e) {
          console.error("  [chat] saveSession failed:", e);
        }
      }
    });
  });

  return app;
}
