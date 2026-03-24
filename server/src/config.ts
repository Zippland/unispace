import { homedir } from "os";
import { join } from "path";
import {
  existsSync,
  chmodSync,
  cpSync,
  readFileSync,
  writeFileSync,
} from "fs";

// ── Paths ─────────────────────────────────────────────────────

const DEFAULT_DIR = join(homedir(), ".unispace");
const TEMPLATE_DIR = join(import.meta.dir, "..", "workspace");

export function getDir(): string {
  return process.env.UNISPACE_DIR || DEFAULT_DIR;
}
export const paths = {
  config: () => join(getDir(), "config.json"),
  sessions: () => join(getDir(), "sessions"),
  soul: () => join(getDir(), "SOUL.md"),
  skills: () => join(getDir(), "skills"),
};

// ── Config schema ─────────────────────────────────────────────

export interface Config {
  model: {
    provider: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    temperature: number;
    maxTokens: number;
  };
  server: {
    port: number;
    workDir: string;
  };
}

const DEFAULTS: Config = {
  model: {
    provider: "moonshot",
    name: "kimi-k2.5",
    apiKey: "",
    baseUrl: "https://api.moonshot.cn/v1",
    temperature: 1.0,
    maxTokens: 16384,
  },
  server: {
    port: 3210,
    workDir: "",
  },
};

// ── Init / onboard ────────────────────────────────────────────

export function ensureInit(): void {
  const dir = getDir();

  if (!existsSync(dir)) {
    // Copy template workspace to ~/.unispace/
    cpSync(TEMPLATE_DIR, dir, { recursive: true });
    chmodSync(dir, 0o700);
    console.log(`  Initialized workspace from template → ${dir}`);
    console.log(`  → Edit ${paths.config()} to set your API key`);
  }
}

// ── Load / save ───────────────────────────────────────────────

export function loadConfig(): Config {
  const raw = JSON.parse(readFileSync(paths.config(), "utf-8"));
  const config: Config = {
    model: { ...DEFAULTS.model, ...raw.model },
    server: { ...DEFAULTS.server, ...raw.server },
  };

  // Env overrides
  if (process.env.MOONSHOT_API_KEY) config.model.apiKey = process.env.MOONSHOT_API_KEY;
  if (process.env.PORT) config.server.port = parseInt(process.env.PORT);

  return config;
}

export function saveConfig(config: Config): void {
  writeFileSync(paths.config(), JSON.stringify(config, null, 2));
}
