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
  templatesRoot: () => join(getDir(), "project-templates"),

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
  currentProject: "default",
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
  name: string;
  path: string;
  updatedAt: number;
}

export function listProjects(): ProjectInfo[] {
  const root = paths.projectsRoot();
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const p = join(root, e.name);
      return { name: e.name, path: p, updatedAt: statSync(p).mtimeMs };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function projectExists(name: string): boolean {
  return existsSync(paths.project(name));
}

// ── Project settings (stored in .claude/settings.json) ──────
// `model` is a Claude Code field name. UniSpace runs the SDK in
// isolation mode (settingSources: []) so the SDK does NOT auto-load
// settings.json — `loadProjectContext` below reads it manually and
// agent.ts passes the model through as a query() option.

export interface ProjectSettings {
  model?: string;
}

/** Path-based settings reader. Source of truth for parsing
 *  `.claude/settings.json`. Both API endpoints (via `readProjectSettings`)
 *  and the SDK runner (via `loadProjectContext`) call this. */
function readProjectSettingsAt(projectDir: string): ProjectSettings {
  const file = join(projectDir, ".claude", "settings.json");
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    return { model: typeof raw.model === "string" ? raw.model : undefined };
  } catch {
    return {};
  }
}

export function readProjectSettings(name: string): ProjectSettings {
  return readProjectSettingsAt(paths.project(name));
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
  name: string,
  partial: ProjectSettings,
): void {
  const file = paths.projectSettings(name);
  const dir = join(file, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

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

/** Create a new project by cloning a template. Throws if target exists. */
export function createProjectFromTemplate(
  templateId: string,
  projectName: string,
): void {
  // Validate template id shape: "<bu>/<slug>", no path traversal
  if (!/^[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/.test(templateId)) {
    throw new Error(`Invalid template id: ${templateId}`);
  }
  const [bu, slug] = templateId.split("/");
  const src = join(paths.templatesRoot(), bu, slug);
  if (!existsSync(src)) throw new Error(`Template not found: ${templateId}`);

  const safeName = projectName.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
  if (!safeName) throw new Error("Invalid project name");
  const dst = paths.project(safeName);
  if (existsSync(dst)) throw new Error(`Project already exists: ${safeName}`);

  // Ensure projects root exists then copy
  if (!existsSync(paths.projectsRoot())) {
    mkdirSync(paths.projectsRoot(), { recursive: true });
  }
  cpSync(src, dst, { recursive: true });

  // Strip the template metadata file from the clone — it's only used at
  // gallery time and has no meaning inside an instantiated project.
  const tmplMeta = join(dst, "template.json");
  if (existsSync(tmplMeta)) {
    try {
      unlinkSync(tmplMeta);
    } catch {}
  }

  // Templates don't ship a sessions/ subdir — every project needs one
  const sessDir = paths.projectSessions(safeName);
  if (!existsSync(sessDir)) mkdirSync(sessDir, { recursive: true });
}

/** Create an empty project scaffold with a minimal CLAUDE.md and the
 *  standard subdirectories. Used by the "Blank project" card in the
 *  welcome gallery. */
export function createBlankProject(name: string): void {
  const safeName = name.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
  if (!safeName) throw new Error("Invalid project name");
  const dst = paths.project(safeName);
  if (existsSync(dst)) throw new Error(`Project already exists: ${safeName}`);

  if (!existsSync(paths.projectsRoot())) {
    mkdirSync(paths.projectsRoot(), { recursive: true });
  }
  mkdirSync(dst, { recursive: true });
  mkdirSync(join(dst, "sessions"), { recursive: true });
  writeFileSync(
    join(dst, "CLAUDE.md"),
    `# ${safeName}\n\nYour project's main agent. Describe who this agent is, what it knows, and how it should behave.\n`,
  );
}

/** Recursively delete a project folder. Throws if it doesn't exist.
 *  Caller is responsible for enforcing "can't delete current / only
 *  project" policy at the API layer. */
export function deleteProject(name: string): void {
  const dir = paths.project(name);
  if (!existsSync(dir)) throw new Error(`Project not found: ${name}`);
  rmSync(dir, { recursive: true, force: true });
}

/** Clone a project folder. Throws if dst already exists. */
export function cloneProject(from: string, to: string): void {
  const src = paths.project(from);
  const dst = paths.project(to);
  if (!existsSync(src)) throw new Error(`Source project not found: ${from}`);
  if (existsSync(dst)) throw new Error(`Target project already exists: ${to}`);
  cpSync(src, dst, { recursive: true });
  // Wipe session history in the clone — carry only the project skeleton
  const sessDir = paths.projectSessions(to);
  if (existsSync(sessDir)) {
    for (const f of readdirSync(sessDir)) {
      if (f === ".gitkeep") continue;
      try {
        unlinkSync(join(sessDir, f));
      } catch {}
    }
  }
}

