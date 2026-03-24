import { homedir } from "os";
import { join } from "path";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "fs";

// ── Paths ─────────────────────────────────────────────────────

const DEFAULT_DIR = join(homedir(), ".unispace");

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

const DEFAULT_SOUL = `# SOUL.md
# Customize the agent's personality and behavior here.

## Guidelines
- Be concise and direct
- Prefer minimal, precise code changes
- Explain reasoning when making non-obvious decisions
`;

export function ensureInit(): void {
  const dir = getDir();

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    console.log(`  Created ${dir}`);
  }

  const cp = paths.config();
  const isNew = !existsSync(cp);
  if (isNew) {
    writeFileSync(cp, JSON.stringify(DEFAULTS, null, 2));
    console.log(`  Created ${cp}`);
    console.log(`  → Edit this file to set your API key and preferences`);
  }

  for (const d of [paths.sessions(), paths.skills()]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }

  const sp = paths.soul();
  if (!existsSync(sp)) {
    writeFileSync(sp, DEFAULT_SOUL);
    console.log(`  Created ${sp}`);
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
