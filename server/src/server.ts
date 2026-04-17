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
  getProjectById,
  getProjectBySlug,
  projectDir,
  projectExists,
  cloneProject,
  createBlankProject,
  deleteProject,
  renameProject,
  listTemplates,
  createProjectFromTemplate,
  readProjectSettings,
  writeProjectSettings,
  loadProjectRegistry,
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
import {
  createTraceCollector,
  listTraces,
  loadTrace,
} from "./trace";
import {
  listAgents as listBAgents,
  getAgent as getBAgent,
  createAgent as createBAgent,
  saveAgent as saveBAgent,
  deleteAgent as deleteBAgent,
  generateApiKey,
  revokeApiKey,
  validateApiKey,
} from "./agents";
import {
  listDatasources,
  getDatasource,
  listCatalogWithStatus,
  installFromCatalog,
  uninstallDatasource,
  mountSession,
} from "./datasources";
import {
  listTasks,
  getTask,
  saveTask,
  deleteTask,
  recordTaskRun,
  composeTaskPrompt,
  type SaveTaskInput,
  type TaskFile,
} from "./tasks";
import {
  listConnectors,
  getConnector,
  listConnectorCatalogWithStatus,
  installConnectorFromCatalog,
  uninstallConnector,
} from "./connectors";

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
  return projectDir(cfg.currentProject);
}

// ── Server ────────────────────────────────────────────────────

export function createServer(_initialConfig: Config) {
  // Ensure project registry is loaded
  loadProjectRegistry();

  // Ensure the "mira" home project exists (Mira main workspace)
  if (!projectExists("mira")) {
    const miraDir = paths.project("mira");
    mkdirSync(join(miraDir, "sessions"), { recursive: true });
    mkdirSync(join(miraDir, ".claude"), { recursive: true });
    // Auto-register it
    loadProjectRegistry();
  }

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
      workDir: projectDir(cfg.currentProject),
    });
  });

  // Debug / Inspector — project introspection for the dev panel.
  // Reports only what the server can honestly see on disk + in memory.
  // The SDK owns the real system prompt / tool registry, so we don't
  // pretend to know those.
  app.get("/api/debug/inspect", async (c) => {
    const cfg = loadConfig();
    const currentId = cfg.currentProject;
    const currentDir = projectDir(currentId);
    const currentProj = getProjectById(currentId);

    // CLAUDE.md (project-level system prompt input)
    let claudeMd: string | null = null;
    try {
      claudeMd = await Bun.file(join(currentDir, "CLAUDE.md")).text();
    } catch {}

    // .claude/settings.json
    let settings: unknown = null;
    try {
      settings = JSON.parse(
        await Bun.file(join(currentDir, ".claude", "settings.json")).text(),
      );
    } catch {}

    // .claude/agents/*.md → parse frontmatter + body preview
    const agentsDir = resolve(currentDir, ".claude", "agents");
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
    const skillsDir = join(currentDir, ".claude", "skills");
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
        id: currentId,
        name: currentProj?.name || currentId,
        path: currentDir,
        sessionCount: listSessions(currentId).length,
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
    if (!from || !to) return c.json({ error: "from (id) and to (name) required" }, 400);
    try {
      const newId = cloneProject(from, to);
      return c.json({ ok: true, id: newId, name: to });
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
      const id = createProjectFromTemplate(templateId, projectName);
      return c.json({ ok: true, id, name: projectName });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.post("/api/projects/blank", async (c) => {
    const { projectName } = await c.req.json();
    if (!projectName) return c.json({ error: "projectName required" }, 400);
    try {
      const id = createBlankProject(projectName);
      return c.json({ ok: true, id, name: projectName });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.put("/api/projects/current", async (c) => {
    const body = await c.req.json();
    // Accept { id } or { name } (backward compat)
    let resolved = body.id ? getProjectById(body.id) : undefined;
    if (!resolved && body.name) resolved = getProjectBySlug(body.name);
    if (!resolved) {
      return c.json({ error: "Project not found" }, 404);
    }
    const cfg = loadConfig();
    cfg.currentProject = resolved.id;
    saveConfig(cfg);
    return c.json({ ok: true, current: resolved.id });
  });

  app.post("/api/projects/rename", async (c) => {
    const { id, newName } = await c.req.json();
    if (!id || !newName) return c.json({ error: "id and newName required" }, 400);
    try {
      renameProject(id, newName);
      return c.json({ ok: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.delete("/api/projects/:id", async (c) => {
    const id = c.req.param("id");
    const cfg = loadConfig();

    if (id === cfg.currentProject) {
      return c.json({ error: "Cannot delete the current project. Switch away first." }, 400);
    }
    if (listProjects().length <= 1) {
      return c.json({ error: "Cannot delete the only remaining project." }, 400);
    }
    if (!getProjectById(id)) {
      return c.json({ error: "Project not found" }, 404);
    }

    try {
      for (const s of listSessions(id)) {
        deleteSession(s.id);
      }
      deleteProject(id);
      return c.json({ ok: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  // Per-project settings: model + effort, persisted to .claude/settings.json
  app.get("/api/projects/:id/settings", (c) => {
    const id = c.req.param("id");
    if (!getProjectById(id)) return c.json({ error: "Not found" }, 404);
    return c.json(readProjectSettings(id));
  });

  app.put("/api/projects/:id/settings", async (c) => {
    const id = c.req.param("id");
    if (!getProjectById(id)) return c.json({ error: "Not found" }, 404);
    const body = await c.req.json();
    writeProjectSettings(id, {
      model: body.model,
      emoji: body.emoji,
      description: body.description,
    });
    return c.json({ ok: true, settings: readProjectSettings(id) });
  });

  // ── Files (scoped to current project) ────────────────────
  // `?all=1` reveals dotfiles and IGNORE-filtered entries and skips
  // .claude hoisting — so users can inspect the full on-disk layout.
  // Session enrichment is orthogonal and always runs, otherwise the
  // sidebar Recents panel (which reads the sessions folder from this
  // same tree) would lose titles/updatedAt whenever super-admin mode
  // is on.
  app.get("/api/files", async (c) => {
    const dir = currentProjectDir();
    const showAll = c.req.query("all") === "1";
    let tree = await listDir(dir, "", 0, showAll);

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

    if (showAll) return c.json(tree);

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

  // ── Datasources (scoped to current project) ──────────────
  // The datasource model has two tiers:
  //   • catalog  — bundled samples in `server/fixtures/datasources/`
  //   • installed — user-curated subset living in the project's
  //                 `.claude/datasources/` folder
  // /api/datasources returns the installed list (what the agent
  // actually sees via the `query_datasource` MCP tool). The Picker
  // consumes /api/datasources/catalog to offer new installs.
  app.get("/api/datasources", async (c) => {
    const workDir = currentProjectDir();
    const list = await listDatasources(workDir);
    return c.json(
      list.map((d) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        display_name: d.display_name,
        region: d.region,
        description: d.description,
        schema: d.schema,
        is_demo_sample: !!d._demo_note,
      })),
    );
  });

  app.get("/api/datasources/catalog", async (c) => {
    const workDir = currentProjectDir();
    const list = await listCatalogWithStatus(workDir);
    return c.json(
      list.map((d) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        display_name: d.display_name,
        region: d.region,
        description: d.description,
        schema: d.schema,
        is_demo_sample: !!d._demo_note,
        installed: d.installed,
      })),
    );
  });

  app.post("/api/datasources/install", async (c) => {
    const workDir = currentProjectDir();
    const body = (await c.req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return c.json({ error: "id required" }, 400);
    try {
      const ds = await installFromCatalog(workDir, body.id);
      return c.json({ ok: true, id: ds.id });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400,
      );
    }
  });

  app.post("/api/datasources/mount-session", async (c) => {
    const workDir = currentProjectDir();
    const cfg = loadConfig();
    const body = (await c.req.json().catch(() => ({}))) as { sessionId?: string };
    if (!body.sessionId) return c.json({ error: "sessionId required" }, 400);
    const session = getSession(body.sessionId);
    if (!session) return c.json({ error: "Session not found" }, 404);
    const sourceProject = getProjectById(session.projectId);
    try {
      const ds = await mountSession(
        workDir,
        session.id,
        session.title || session.id.slice(0, 8),
        session.projectId,
        sourceProject?.name || session.projectId,
      );
      return c.json({ ok: true, id: ds.id });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  });

  app.delete("/api/datasources/:id{.+}", async (c) => {
    const workDir = currentProjectDir();
    const id = decodeURIComponent(c.req.param("id"));
    // Guard against the catalog suffix — `DELETE /api/datasources/catalog`
    // would otherwise match this route.
    if (id === "catalog") return c.json({ error: "Not found" }, 404);
    await uninstallDatasource(workDir, id);
    return c.json({ ok: true });
  });

  app.get("/api/datasources/:id{.+}", async (c) => {
    const workDir = currentProjectDir();
    const id = decodeURIComponent(c.req.param("id"));
    if (id === "catalog") return c.json({ error: "Not found" }, 404);
    const ds = await getDatasource(workDir, id);
    if (!ds) return c.json({ error: "Not found" }, 404);
    return c.json(ds);
  });

  // ── Connectors (scoped to current project) ───────────────
  // Outbound action channels — the agent's handle to "make X happen
  // in the outside world". Same two-tier model as datasources:
  //   • catalog under `server/fixtures/connectors/`
  //   • installed under `<project>/.claude/connectors/`
  // Installed entries are surfaced to the agent as one SDK MCP
  // `<slug>_invoke` tool each (see `connectors.ts buildConnectorMcp`).
  // Demo mode: every invoke returns an echoed envelope with a
  // `_demo_note` rather than actually calling out.
  app.get("/api/connectors", async (c) => {
    const workDir = currentProjectDir();
    const list = await listConnectors(workDir);
    return c.json(
      list.map((x) => ({
        id: x.id,
        type: x.type,
        name: x.name,
        display_name: x.display_name,
        description: x.description,
        status: x.status,
        actions: x.actions || [],
        is_demo: !!x._demo_note,
      })),
    );
  });

  app.get("/api/connectors/catalog", async (c) => {
    const workDir = currentProjectDir();
    const list = await listConnectorCatalogWithStatus(workDir);
    return c.json(
      list.map((x) => ({
        id: x.id,
        type: x.type,
        name: x.name,
        display_name: x.display_name,
        description: x.description,
        status: x.status,
        actions: x.actions || [],
        is_demo: !!x._demo_note,
        installed: x.installed,
      })),
    );
  });

  app.post("/api/connectors/install", async (c) => {
    const workDir = currentProjectDir();
    const body = (await c.req.json().catch(() => ({}))) as { id?: string };
    if (!body.id) return c.json({ error: "id required" }, 400);
    try {
      const conn = await installConnectorFromCatalog(workDir, body.id);
      return c.json({ ok: true, id: conn.id });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400,
      );
    }
  });

  app.delete("/api/connectors/:id{.+}", async (c) => {
    const workDir = currentProjectDir();
    const id = decodeURIComponent(c.req.param("id"));
    if (id === "catalog") return c.json({ error: "Not found" }, 404);
    await uninstallConnector(workDir, id);
    return c.json({ ok: true });
  });

  app.get("/api/connectors/:id{.+}", async (c) => {
    const workDir = currentProjectDir();
    const id = decodeURIComponent(c.req.param("id"));
    if (id === "catalog") return c.json({ error: "Not found" }, 404);
    const conn = await getConnector(workDir, id);
    if (!conn) return c.json({ error: "Not found" }, 404);
    return c.json(conn);
  });

  // ── Tasks (scoped to current project) ────────────────────
  // Tasks are preset prompts + trigger declarations stored as
  // `<project>/.claude/tasks/<name>.md`. The demo has no scheduler —
  // `POST /api/tasks/:name/run` is the only way a task actually
  // fires. The trigger field is present in UI and storage to
  // communicate the intended product shape.
  app.get("/api/tasks", async (c) => {
    const workDir = currentProjectDir();
    const list = await listTasks(workDir);
    return c.json(list);
  });

  app.get("/api/tasks/:name", async (c) => {
    const workDir = currentProjectDir();
    const task = await getTask(workDir, c.req.param("name"));
    if (!task) return c.json({ error: "Not found" }, 404);
    return c.json(task);
  });

  app.post("/api/tasks", async (c) => {
    const workDir = currentProjectDir();
    const body = (await c.req.json().catch(() => ({}))) as SaveTaskInput;
    if (!body.name || !body.body)
      return c.json({ error: "name and body required" }, 400);
    try {
      const task = await saveTask(workDir, body);
      return c.json(task);
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400,
      );
    }
  });

  app.put("/api/tasks/:name", async (c) => {
    const workDir = currentProjectDir();
    const name = c.req.param("name");
    const body = (await c.req.json().catch(() => ({}))) as Partial<SaveTaskInput>;
    try {
      const task = await saveTask(workDir, {
        name,
        description: body.description,
        trigger: body.trigger,
        schedule: body.schedule,
        continuation: body.continuation,
        body: body.body ?? "",
      });
      return c.json(task);
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400,
      );
    }
  });

  app.delete("/api/tasks/:name", async (c) => {
    const workDir = currentProjectDir();
    try {
      await deleteTask(workDir, c.req.param("name"));
      return c.json({ ok: true });
    } catch (e) {
      return c.json(
        { error: e instanceof Error ? e.message : String(e) },
        400,
      );
    }
  });

  // Manually trigger a task: creates a fresh session, pushes the
  // task's prompt as a user message, and launches runAgent in the
  // background so the client can open the session view immediately
  // and watch the stream land via the existing session polling
  // path. Fire-and-forget — the endpoint returns as soon as the
  // session is created, not when the agent finishes.
  app.post("/api/tasks/:name/run", async (c) => {
    const cfg = loadConfig();
    const currentId = cfg.currentProject;
    const workDir = projectDir(currentId);
    const task = await getTask(workDir, c.req.param("name"));
    if (!task) return c.json({ error: "Task not found" }, 404);

    const session = createSession(currentId);
    session.title = `[Task] ${task.name}`;
    const userContent = composeTaskPrompt(task);
    session.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", content: userContent }],
    });
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [],
    };
    session.messages.push(assistantMsg);
    saveSession(session);

    // Fire agent run in the background. We intentionally don't
    // await — the endpoint response returns the new session id,
    // and the chat UI picks up the streamed events as they land.
    // The tracer auto-finalizes on the "done" event emitted by
    // runAgent, so no explicit teardown is needed.
    (async () => {
      try {
        const tracer = createTraceCollector({
          project: session.projectId,
          sessionId: session.id,
          prompt: userContent,
        });
        for await (const event of runAgent({
          prompt: userContent,
          cwd: workDir,
        })) {
          applyAgentEvent(event, assistantMsg, session);
          tracer.processEvent(event);
        }
      } catch (err) {
        console.error("  [task run] agent failed:", err);
      } finally {
        saveSession(session);
        await recordTaskRun(workDir, task.name, session.id).catch(() => {});
      }
    })();

    return c.json({ session_id: session.id });
  });

  // ── Sessions (scoped to current project) ─────────────────
  app.post("/api/sessions", async (c) => {
    const cfg = loadConfig();
    const body = await c.req.json().catch(() => ({}));
    const projId = body.project || cfg.currentProject;
    try {
      const s = createSession(projId);
      return c.json({
        id: s.id,
        projectId: s.projectId,
        createdAt: s.createdAt,
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.get("/api/sessions", (c) => {
    const cfg = loadConfig();
    const all = c.req.query("all") === "1";
    const scope = all ? undefined : (c.req.query("project") ?? cfg.currentProject);
    return c.json(
      listSessions(scope).map((s) => ({
        id: s.id,
        projectId: s.projectId,
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
      projectId: s.projectId,
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

      const projDir = projectDir(session.projectId);

      // Expand `/cmd` slash-command tokens server-side. The original
      // text stays in session.messages so the UI shows what the user
      // typed; only the LLM payload sees the resolved bodies.
      const expandedPrompt = await expandSlashCommands(content, projDir);

      // Trace collection — every agent turn is automatically traced.
      const tracer = createTraceCollector({
        project: session.projectId,
        sessionId: session.id,
        agentName,
        prompt: content,
      });

      try {
        for await (const event of runAgent({
          prompt: expandedPrompt,
          cwd: projDir,
          resumeSessionId: session.sdkSessionId,
          signal: ac.signal,
          agentName,
          agentDefinition,
        })) {
          applyAgentEvent(event, assistantMsg, session);
          tracer.processEvent(event);
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

  // ── Admin API (traces, agents) ──────────────────────────────

  app.get("/api/admin/traces", (c) => {
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const search = c.req.query("search") || undefined;
    const result = listTraces({ limit, offset, search });
    return c.json({
      code: "SUCC",
      data: {
        traces: result.traces.map((t) => ({
          id: t.id,
          trace_id: t.id,
          project: t.project,
          session_id: t.session_id,
          agent_name: t.agent_name,
          query_preview: t.query_preview,
          status: t.status,
          start_time: t.start_time,
          created_at: t.start_time,
          duration_ms: t.duration_ms,
          span_count: t.spans.length,
          error: t.error,
          metadata: {
            query_preview: t.query_preview,
            agent_name: t.agent_name,
          },
        })),
        total: result.total,
      },
    });
  });

  app.get("/api/admin/traces/:id", (c) => {
    const trace = loadTrace(c.req.param("id"));
    if (!trace) return c.json({ code: "NOT_FOUND", message: "Trace not found" }, 404);

    const root = trace.spans.find((s) => s.parent_id === null);
    const children = trace.spans.filter((s) => s.parent_id !== null);

    return c.json({
      code: "SUCC",
      data: { root, children },
    });
  });

  app.get("/api/admin/traces/:traceId/spans/:spanId", (c) => {
    const trace = loadTrace(c.req.param("traceId"));
    if (!trace) return c.json({ code: "NOT_FOUND", message: "Trace not found" }, 404);

    const span = trace.spans.find((s) => s.id === c.req.param("spanId"));
    if (!span) return c.json({ code: "NOT_FOUND", message: "Span not found" }, 404);

    return c.json({ code: "SUCC", data: span });
  });

  app.get("/api/admin/traces/:traceId/spans/:spanId/children", (c) => {
    const trace = loadTrace(c.req.param("traceId"));
    if (!trace) return c.json({ code: "NOT_FOUND", message: "Trace not found" }, 404);

    const children = trace.spans.filter(
      (s) => s.parent_id === c.req.param("spanId"),
    );
    return c.json({ code: "SUCC", data: children });
  });

  // ── B-side Agent CRUD (separate from C-side projects) ────────
  // B-side agents are standalone configurations managed by BU admins.
  // Each agent can be deployed as a Response API serving many users,
  // each in their own sandbox.

  app.get("/api/admin/agents", (c) => {
    return c.json({ code: "SUCC", data: listBAgents() });
  });

  app.get("/api/admin/agents/:id", (c) => {
    const agent = getBAgent(c.req.param("id"));
    if (!agent) return c.json({ code: "NOT_FOUND", message: "Agent not found" }, 404);
    return c.json({ code: "SUCC", data: agent });
  });

  app.post("/api/admin/agents", async (c) => {
    const body = await c.req.json();
    try {
      const agent = createBAgent(body);
      return c.json({ code: "SUCC", data: agent });
    } catch (e: any) {
      return c.json({ code: "ERROR", message: e.message }, 400);
    }
  });

  app.put("/api/admin/agents/:id", async (c) => {
    const agent = getBAgent(c.req.param("id"));
    if (!agent) return c.json({ code: "NOT_FOUND", message: "Agent not found" }, 404);
    const body = await c.req.json();
    Object.assign(agent, body, { id: agent.id, created_at: agent.created_at });
    saveBAgent(agent);
    return c.json({ code: "SUCC", data: agent });
  });

  app.delete("/api/admin/agents/:id", (c) => {
    if (!deleteBAgent(c.req.param("id"))) {
      return c.json({ code: "NOT_FOUND", message: "Agent not found" }, 404);
    }
    return c.json({ code: "SUCC" });
  });

  // ── API Key management ──────────────────────────────────────

  app.post("/api/admin/agents/:id/keys", async (c) => {
    const { name } = await c.req.json();
    const result = await generateApiKey(c.req.param("id"), name || "Default");
    if (!result) return c.json({ code: "NOT_FOUND", message: "Agent not found" }, 404);
    // Return the full key only on creation — it's never stored or shown again
    return c.json({ code: "SUCC", data: { key: result.key, apiKey: result.apiKey } });
  });

  app.delete("/api/admin/agents/:id/keys/:keyId", (c) => {
    if (!revokeApiKey(c.req.param("id"), c.req.param("keyId"))) {
      return c.json({ code: "NOT_FOUND", message: "Key not found" }, 404);
    }
    return c.json({ code: "SUCC" });
  });

  // ── Playground test endpoint (admin preview) ────────────────
  // Lets the AgentDetailPage playground tab test an agent without
  // deploying it. No session persistence — purely ephemeral.

  app.post("/api/admin/agents/:id/test", async (c) => {
    const agent = getBAgent(c.req.param("id"));
    if (!agent) return c.json({ code: "NOT_FOUND" }, 404);

    const { message } = await c.req.json();
    if (!message) return c.json({ error: "message required" }, 400);

    const tracer = createTraceCollector({
      project: `agent:${agent.id}`,
      agentName: agent.name,
      prompt: message,
    });

    return streamSSE(c, async (stream) => {
      const ac = new AbortController();
      c.req.raw.signal.addEventListener("abort", () => ac.abort());

      const tmpDir = join(paths.projectsRoot(), "..", "sandbox-tmp");
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

      try {
        for await (const event of runAgent({
          prompt: message,
          cwd: tmpDir,
          signal: ac.signal,
          // Inject the agent's persona + model so playground matches real behavior
          ...(agent.system_prompt ? { systemPromptAppend: agent.system_prompt } : {}),
          ...(agent.model ? { modelOverride: agent.model } : {}),
        })) {
          tracer.processEvent(event);
          try {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
          } catch {
            ac.abort();
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        try {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ type: "error", message: msg }),
          });
        } catch {}
      }
    });
  });

  // ── Response API (consumed by BU systems) ──────────────────
  // Stateless chat endpoint: BU sends a message, gets an SSE stream.
  // Authentication via Bearer token (API key generated in admin).

  app.post("/api/v1/chat", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }
    const rawKey = authHeader.slice(7);
    const agent = await validateApiKey(rawKey);
    if (!agent) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    const { message, session_id } = await c.req.json();
    if (!message) return c.json({ error: "message required" }, 400);

    // Trace collection for the Response API call
    const tracer = createTraceCollector({
      project: `agent:${agent.id}`,
      agentName: agent.name,
      prompt: message,
    });

    return streamSSE(c, async (stream) => {
      const ac = new AbortController();
      c.req.raw.signal.addEventListener("abort", () => ac.abort());

      // The Response API uses a temporary working directory.
      // In production this would be the user's sandbox mount.
      // For the demo, use a temp dir under the agents folder.
      const tmpDir = join(paths.projectsRoot(), "..", "sandbox-tmp");
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

      try {
        for await (const event of runAgent({
          prompt: message,
          cwd: tmpDir,
          resumeSessionId: session_id,
          signal: ac.signal,
        })) {
          tracer.processEvent(event);
          try {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
          } catch {
            ac.abort();
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        try {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ type: "error", message: msg }),
          });
        } catch { /* client gone */ }
      }
    });
  });

  return app;
}
