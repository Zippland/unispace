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
  projectsRoot: () => join(getDir(), "projects"),

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
// `model` is a native Claude Code field — the SDK auto-loads it via
// settingSources: ['project']. Thinking effort stays on the SDK
// default (adaptive), so there is nothing else to manage here.

export interface ProjectSettings {
  model?: string;
}

export function readProjectSettings(name: string): ProjectSettings {
  const file = paths.projectSettings(name);
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    return { model: raw.model };
  } catch {
    return {};
  }
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

