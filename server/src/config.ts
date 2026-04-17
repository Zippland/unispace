import { homedir } from "os";
import { join } from "path";
import {
  existsSync,
  chmodSync,
  cpSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  mkdirSync,
  rmSync,
} from "fs";

// ── Paths ─────────────────────────────────────────────────────

const DEFAULT_DIR = join(homedir(), ".unispace");
const TEMPLATE_DIR = join(import.meta.dir, "..", "workspace");

export function getDir(): string {
  return process.env.UNISPACE_DIR || DEFAULT_DIR;
}

export const paths = {
  // Global
  config: () => join(getDir(), "config.json"),
  channels: () => join(getDir(), "channels.json"),
  projectsRoot: () => join(getDir(), "projects"),
  templatesRoot: () => {
    // Prefer bundled templates shipped with the app; fall back to user dir
    const bundled = join(TEMPLATE_DIR, "project-templates");
    if (existsSync(bundled)) return bundled;
    return join(getDir(), "project-templates");
  },

  // Traces (global, cross-project)
  tracesRoot: () => join(getDir(), "traces"),

  // Per-project
  project: (name: string) => join(getDir(), "projects", name),
  projectClaude: (name: string) => join(getDir(), "projects", name, "CLAUDE.md"),
  projectSessions: (name: string) =>
    join(getDir(), "projects", name, "sessions"),
  projectSkills: (name: string) =>
    join(getDir(), "projects", name, ".claude", "skills"),
  projectSettings: (name: string) =>
    join(getDir(), "projects", name, ".claude", "settings.json"),
};

// ── Config schema ─────────────────────────────────────────────
// UniSpace inherits authentication and the default model from your local
// Claude Code install (via the bundled SDK). No API key needed here.

export interface Config {
  server: {
    port: number;
  };
  currentProject: string;
}

const DEFAULTS: Config = {
  server: {
    port: 3210,
  },
  currentProject: "mira",
};

// ── Init ──────────────────────────────────────────────────────

export function ensureInit(): void {
  const dir = getDir();

  if (!existsSync(dir)) {
    cpSync(TEMPLATE_DIR, dir, { recursive: true });
    chmodSync(dir, 0o700);
    console.log(`  Initialized workspace from template → ${dir}`);
  }
}

// ── Load / save ───────────────────────────────────────────────

export function loadConfig(): Config {
  const raw = JSON.parse(readFileSync(paths.config(), "utf-8"));
  const config: Config = {
    server: { ...DEFAULTS.server, ...raw.server },
    currentProject: raw.currentProject || DEFAULTS.currentProject,
  };

  if (process.env.PORT) config.server.port = parseInt(process.env.PORT);

  return config;
}

export function saveConfig(config: Config): void {
  writeFileSync(paths.config(), JSON.stringify(config, null, 2));
}

// ── Projects ──────────────────────────────────────────────────

export interface ProjectInfo {
  id: string;          // stable uuid, never changes
  name: string;        // display name, user can rename
  slug: string;        // folder name on disk
  path: string;        // absolute path
  updatedAt: number;
}

/** In-memory id → ProjectInfo registry. Rebuilt on startup and after mutations. */
const projectRegistry = new Map<string, ProjectInfo>();

function generateProjectId(): string {
  return `cw_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

interface ProjectMeta { id: string; name: string }

function readProjectMeta(projectDir: string): ProjectMeta | null {
  const metaPath = join(projectDir, "project.json");
  if (!existsSync(metaPath)) return null;
  try { return JSON.parse(readFileSync(metaPath, "utf-8")); } catch { return null; }
}

function writeProjectMeta(projectDir: string, meta: ProjectMeta): void {
  writeFileSync(join(projectDir, "project.json"), JSON.stringify(meta, null, 2));
}

/** Scan projects root, ensure every project has a project.json with stable id. */
export function loadProjectRegistry(): void {
  projectRegistry.clear();
  const root = paths.projectsRoot();
  if (!existsSync(root)) return;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    let meta = readProjectMeta(dir);
    if (!meta) {
      // Backward compat: auto-generate id for old projects without project.json
      meta = { id: generateProjectId(), name: entry.name };
      writeProjectMeta(dir, meta);
    }
    projectRegistry.set(meta.id, {
      id: meta.id,
      name: meta.name,
      slug: entry.name,
      path: dir,
      updatedAt: statSync(dir).mtimeMs,
    });
  }
}

export function listProjects(): ProjectInfo[] {
  return [...projectRegistry.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProjectById(id: string): ProjectInfo | undefined {
  return projectRegistry.get(id);
}

export function getProjectBySlug(slug: string): ProjectInfo | undefined {
  for (const p of projectRegistry.values()) {
    if (p.slug === slug) return p;
  }
  return undefined;
}

/** Resolve a project id to its directory path. Throws if not found. */
export function projectDir(id: string): string {
  const p = projectRegistry.get(id);
  if (!p) throw new Error(`Project not found: ${id}`);
  return p.path;
}

export function projectExists(idOrSlug: string): boolean {
  return projectRegistry.has(idOrSlug) || !!getProjectBySlug(idOrSlug);
}

// ── Project settings (stored in .claude/settings.json) ──────
// `model` is a Claude Code field name. UniSpace runs the SDK in
// isolation mode (settingSources: []) so the SDK does NOT auto-load
// settings.json — `loadProjectContext` below reads it manually and
// agent.ts passes the model through as a query() option.

export interface ProjectSettings {
  model?: string;
  emoji?: string;
  description?: string;
}

/** Path-based settings reader. Source of truth for parsing
 *  `.claude/settings.json`. Both API endpoints (via `readProjectSettings`)
 *  and the SDK runner (via `loadProjectContext`) call this. */
function readProjectSettingsAt(projectDir: string): ProjectSettings {
  const file = join(projectDir, ".claude", "settings.json");
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    return {
      model: typeof raw.model === "string" ? raw.model : undefined,
      emoji: typeof raw.emoji === "string" ? raw.emoji : undefined,
      description: typeof raw.description === "string" ? raw.description : undefined,
    };
  } catch {
    return {};
  }
}

export function readProjectSettings(id: string): ProjectSettings {
  return readProjectSettingsAt(projectDir(id));
}

// ── Project context (everything the SDK runner needs at run time) ──
// Single source of truth for "what files in a project dir affect
// agent behavior". When you add a new project-scoped concept (env
// vars, permissions, mcp servers, hooks…), extend this — agent.ts
// stays a thin SDK adapter and never touches the filesystem directly.

export interface ProjectContext {
  /** Body of the project's CLAUDE.md, if present and non-empty.
   *  Caller appends this to the SDK's preset system prompt. */
  claudeMd?: string;
  /** Model id from `.claude/settings.json`, if set. */
  model?: string;
}

export function loadProjectContext(projectDir: string): ProjectContext {
  const ctx: ProjectContext = {};

  const claudeMdPath = join(projectDir, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    try {
      const text = readFileSync(claudeMdPath, "utf-8");
      if (text.trim()) ctx.claudeMd = text;
    } catch {}
  }

  const settings = readProjectSettingsAt(projectDir);
  if (settings.model) ctx.model = settings.model;

  return ctx;
}

// ── Channels config ──────────────────────────────────────────

import type { ChannelsConfig } from "./channels/types";

export function loadChannelsConfig(): ChannelsConfig {
  const p = paths.channels();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

export function saveChannelsConfig(config: ChannelsConfig): void {
  writeFileSync(paths.channels(), JSON.stringify(config, null, 2));
}

export function writeProjectSettings(
  id: string,
  partial: ProjectSettings,
): void {
  const projPath = projectDir(id);
  const file = join(projPath, ".claude", "settings.json");
  const settingsDir = join(file, "..");
  if (!existsSync(settingsDir)) mkdirSync(settingsDir, { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      existing = JSON.parse(readFileSync(file, "utf-8"));
    } catch {}
  }

  const merged: Record<string, unknown> = { ...existing };
  for (const [k, v] of Object.entries(partial)) {
    if (v == null || v === "") delete merged[k];
    else merged[k] = v;
  }

  writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
}

// ── Project templates (BU-federated) ─────────────────────────

export interface TemplateInfo {
  id: string;              // e.g. "finance/q4-analysis"
  name: string;
  description: string;
  author: string;
  bu: string;
  icon?: string;
  gradient?: string;
}

/** Scan `project-templates/<bu>/<slug>/template.json` and return all
 *  registered templates, grouped later by BU on the client. */
export function listTemplates(): TemplateInfo[] {
  const root = paths.templatesRoot();
  if (!existsSync(root)) return [];

  const out: TemplateInfo[] = [];
  for (const buEntry of readdirSync(root, { withFileTypes: true })) {
    if (!buEntry.isDirectory()) continue;
    const buDir = join(root, buEntry.name);
    for (const tmplEntry of readdirSync(buDir, { withFileTypes: true })) {
      if (!tmplEntry.isDirectory()) continue;
      const metaPath = join(buDir, tmplEntry.name, "template.json");
      if (!existsSync(metaPath)) continue;
      try {
        const raw = JSON.parse(readFileSync(metaPath, "utf-8"));
        out.push({
          id: `${buEntry.name}/${tmplEntry.name}`,
          name: raw.name || tmplEntry.name,
          description: raw.description || "",
          author: raw.author || buEntry.name,
          bu: raw.bu || buEntry.name,
          icon: raw.icon,
          gradient: raw.gradient,
        });
      } catch {
        // skip bad templates
      }
    }
  }
  return out;
}

/** Helper: ensure projects root, slugify name, check no collision. Returns { slug, dst }. */
function prepareProjectDir(displayName: string): { slug: string; dst: string } {
  const slug = displayName.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
  if (!slug) throw new Error("Invalid project name");
  const dst = paths.project(slug);
  if (existsSync(dst)) {
    // append random suffix to avoid collision
    const suffix = crypto.randomUUID().slice(0, 3);
    const altSlug = `${slug}-${suffix}`;
    const altDst = paths.project(altSlug);
    if (existsSync(altDst)) throw new Error(`Project already exists: ${slug}`);
    return { slug: altSlug, dst: altDst };
  }
  if (!existsSync(paths.projectsRoot())) mkdirSync(paths.projectsRoot(), { recursive: true });
  return { slug, dst };
}

/** Write project.json and register in memory. Returns the new ProjectInfo. */
function finalizeNewProject(dst: string, slug: string, displayName: string): ProjectInfo {
  const id = generateProjectId();
  writeProjectMeta(dst, { id, name: displayName });
  mkdirSync(join(dst, "sessions"), { recursive: true });
  const info: ProjectInfo = { id, name: displayName, slug, path: dst, updatedAt: Date.now() };
  projectRegistry.set(id, info);
  return info;
}

/** Create a new project by cloning a template. Returns the new project id. */
export function createProjectFromTemplate(templateId: string, projectName: string): string {
  if (!/^[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/.test(templateId)) {
    throw new Error(`Invalid template id: ${templateId}`);
  }
  const [bu, tmplSlug] = templateId.split("/");
  const src = join(paths.templatesRoot(), bu, tmplSlug);
  if (!existsSync(src)) throw new Error(`Template not found: ${templateId}`);

  const { slug, dst } = prepareProjectDir(projectName);
  cpSync(src, dst, { recursive: true });

  // Strip template metadata
  const tmplMeta = join(dst, "template.json");
  if (existsSync(tmplMeta)) try { unlinkSync(tmplMeta); } catch {}

  const info = finalizeNewProject(dst, slug, projectName);
  return info.id;
}

/** Create an empty project scaffold. Returns the new project id. */
export function createBlankProject(name: string): string {
  const { slug, dst } = prepareProjectDir(name);
  mkdirSync(dst, { recursive: true });
  writeFileSync(join(dst, "CLAUDE.md"), `# ${name}\n\nYour project's main agent.\n`);
  const info = finalizeNewProject(dst, slug, name);
  return info.id;
}

/** Rename a project (display name + folder). Sessions are unaffected (bound by id). */
export function renameProject(id: string, newName: string): void {
  const proj = projectRegistry.get(id);
  if (!proj) throw new Error(`Project not found: ${id}`);
  const newSlug = newName.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
  if (!newSlug) throw new Error("Invalid project name");

  // Update display name in project.json
  writeProjectMeta(proj.path, { id, name: newName });

  // Rename folder if slug changed
  if (newSlug !== proj.slug) {
    const newPath = paths.project(newSlug);
    if (existsSync(newPath)) throw new Error(`Project folder already exists: ${newSlug}`);
    const { renameSync } = require("fs");
    renameSync(proj.path, newPath);
    proj.path = newPath;
    proj.slug = newSlug;
  }
  proj.name = newName;
}

/** Delete a project by id. */
export function deleteProject(id: string): void {
  const proj = projectRegistry.get(id);
  if (!proj) throw new Error(`Project not found: ${id}`);
  rmSync(proj.path, { recursive: true, force: true });
  projectRegistry.delete(id);
}

/** Clone a project. Returns the new project id. */
export function cloneProject(sourceId: string, newName: string): string {
  const src = projectRegistry.get(sourceId);
  if (!src) throw new Error(`Source project not found: ${sourceId}`);
  const { slug, dst } = prepareProjectDir(newName);
  cpSync(src.path, dst, { recursive: true });

  // Wipe session history in the clone
  const sessDir = join(dst, "sessions");
  if (existsSync(sessDir)) {
    for (const f of readdirSync(sessDir)) {
      if (f === ".gitkeep") continue;
      try { unlinkSync(join(sessDir, f)); } catch {}
    }
  }

  // New clone gets its own id
  const info = finalizeNewProject(dst, slug, newName);
  return info.id;
}

