import { join } from "path";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { paths } from "./config";

// ── B-side Agent model ──────────────────────────────────────
// A complete deployment unit: Agent + Environment + API config.
// Completely separate from C-side "projects".
//
// Storage: ~/.unispace/agents/<id>.json

// ── Environment — where the agent runs ──────────────────────

export interface MountConfig {
  /** Host path (NAS/local) */
  source: string;
  /** Path inside sandbox */
  target: string;
  /** Read-only or read-write */
  mode: "ro" | "rw";
}

export interface McpServerConfig {
  name: string;
  /** Command to start the MCP server */
  command: string;
  /** Arguments */
  args: string[];
  /** Whether enabled */
  enabled: boolean;
}

export interface EnvironmentConfig {
  /** Pre-installed runtimes */
  runtimes: string[];
  /** Network access mode */
  network: "open" | "restricted";
  /** Allowed domains when network is restricted */
  network_allowlist: string[];
  /** Directory mounts */
  mounts: MountConfig[];
  /** MCP server configurations */
  mcp_servers: McpServerConfig[];
  /** Environment variables (non-secret) */
  env_vars: Record<string, string>;
}

// ── Response API — how the agent is accessed ────────────────

export interface ApiKey {
  id: string;
  name: string;
  /** First 8 chars of the key (for display) */
  prefix: string;
  /** SHA-256 hash of the full key (for validation) */
  hash: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

export interface ApiConfig {
  /** Whether the Response API endpoint is active */
  enabled: boolean;
  /** API keys for authentication */
  keys: ApiKey[];
  /** Rate limit (requests per minute, 0 = unlimited) */
  rate_limit: number;
  /** Usage counters (reset monthly) */
  usage: {
    total_requests: number;
    total_tokens: number;
    last_reset: string;
  };
}

// ── Dispatch — push to IM platforms ─────────────────────────

export interface DispatchConfig {
  enabled: boolean;
  platform: "feishu";
  /** Feishu App ID */
  app_id: string;
  /** Feishu App Secret (stored, not displayed in full) */
  app_secret: string;
  /** Feishu bot name shown to users */
  bot_name: string;
  /** Welcome message sent on first interaction */
  welcome_message: string;
}

// ── Capabilities — what the agent can do ─────────────────────
// These map 1:1 to C-side project structures (.claude/skills,
// .claude/agents, .claude/commands) and serve as defaults that
// get provisioned into every new user sandbox.

export interface SkillDef {
  /** Skill slug (used as directory name) */
  name: string;
  description: string;
  /** Full SKILL.md content */
  content: string;
  enabled: boolean;
}

export interface SubagentDef {
  /** Agent file name (without .md) */
  name: string;
  description: string;
  /** System prompt body for this subagent */
  prompt: string;
}

export interface CommandDef {
  /** Command name (user types /name) */
  name: string;
  description: string;
  /** Command body. Use $ARGUMENTS for user args. */
  body: string;
}

export interface DefaultFile {
  /** Path relative to workspace root */
  path: string;
  /** File content (text files only) */
  content: string;
}

// ── Agent — the complete deployment unit ────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  /** Icon emoji for gallery display */
  icon: string;
  published: boolean;
  bu: string;
  author: string;

  // ── Persona ─────────────────────────────────────────────
  /** Main system prompt (equivalent to CLAUDE.md) */
  system_prompt: string;
  /** Claude model id */
  model: string;

  // ── Capabilities ────────────────────────────────────────
  /** Skill definitions provisioned into each user sandbox */
  skills: SkillDef[];
  /** Subagent definitions (users can switch in chat) */
  subagents: SubagentDef[];
  /** Slash commands available to users */
  commands: CommandDef[];
  /** Files pre-loaded into workspace on sandbox creation */
  default_files: DefaultFile[];

  /** Sandbox environment configuration */
  environment: EnvironmentConfig;

  // ── Publish channels ────────────────────────────────────
  /** Response API configuration */
  api: ApiConfig;
  /** IM dispatch configuration (Feishu, etc.) */
  dispatch?: DispatchConfig;

  created_at: string;
  updated_at: string;
}

// ── Defaults ────────────────────────────────────────────────

const DEFAULT_ENV: EnvironmentConfig = {
  runtimes: ["python3.13", "nodejs22"],
  network: "restricted",
  network_allowlist: [],
  mounts: [],
  mcp_servers: [],
  env_vars: {},
};

const DEFAULT_API: ApiConfig = {
  enabled: false,
  keys: [],
  rate_limit: 60,
  usage: {
    total_requests: 0,
    total_tokens: 0,
    last_reset: new Date().toISOString(),
  },
};

// ── Persistence ─────────────────────────────────────────────

function agentsDir(): string {
  const dir = join(paths.projectsRoot(), "..", "agents");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function agentFilePath(id: string): string {
  return join(agentsDir(), `${id}.json`);
}

export function getAgent(id: string): AgentConfig | null {
  const p = agentFilePath(id);
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8"));
    // Backfill defaults for agents created before newer fields were added
    if (!raw.environment) raw.environment = { ...DEFAULT_ENV };
    if (!raw.api) raw.api = { ...DEFAULT_API };
    if (!raw.skills || !Array.isArray(raw.skills) || (raw.skills.length > 0 && typeof raw.skills[0] === "string")) raw.skills = [];
    if (!raw.subagents) raw.subagents = [];
    if (!raw.commands) raw.commands = [];
    if (!raw.default_files) raw.default_files = [];
    if (!raw.icon) raw.icon = "agent";
    return raw;
  } catch {
    return null;
  }
}

export function listAgents(): AgentConfig[] {
  const dir = agentsDir();
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const raw = JSON.parse(
            readFileSync(join(dir, f), "utf-8"),
          ) as AgentConfig;
          if (!raw.environment) raw.environment = { ...DEFAULT_ENV };
          if (!raw.api) raw.api = { ...DEFAULT_API };
          if (!raw.skills || !Array.isArray(raw.skills) || (raw.skills.length > 0 && typeof raw.skills[0] === "string")) raw.skills = [];
          if (!raw.subagents) raw.subagents = [];
          if (!raw.commands) raw.commands = [];
          if (!raw.default_files) raw.default_files = [];
          if (!raw.icon) raw.icon = "agent";
          return raw;
        } catch {
          return null;
        }
      })
      .filter((a): a is AgentConfig => a !== null)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  } catch {
    return [];
  }
}

export function saveAgent(agent: AgentConfig): void {
  agent.updated_at = new Date().toISOString();
  writeFileSync(agentFilePath(agent.id), JSON.stringify(agent, null, 2));
}

export function createAgent(
  data: Partial<Omit<AgentConfig, "id" | "created_at" | "updated_at">>,
): AgentConfig {
  const agent: AgentConfig = {
    name: data.name || "Untitled",
    description: data.description || "",
    icon: data.icon || "agent",
    published: data.published || false,
    bu: data.bu || "",
    author: data.author || "",
    system_prompt: data.system_prompt || "",
    model: data.model || "claude-sonnet-4-5",
    skills: data.skills || [],
    subagents: data.subagents || [],
    commands: data.commands || [],
    default_files: data.default_files || [],
    environment: data.environment || { ...DEFAULT_ENV },
    api: data.api || { ...DEFAULT_API },
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveAgent(agent);
  return agent;
}

export function deleteAgent(id: string): boolean {
  const p = agentFilePath(id);
  if (!existsSync(p)) return false;
  try {
    unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

// ── API Key management ──────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a new API key. Returns the full key (only shown once)
 *  and saves the hash to the agent config. */
export async function generateApiKey(
  agentId: string,
  keyName: string,
): Promise<{ key: string; apiKey: ApiKey } | null> {
  const agent = getAgent(agentId);
  if (!agent) return null;

  // Generate key: mira_<agentIdPrefix>_<random>
  const raw = crypto.randomUUID().replace(/-/g, "");
  const fullKey = `mira_${agentId.slice(0, 8)}_${raw}`;
  const hash = await sha256(fullKey);

  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    name: keyName,
    prefix: fullKey.slice(0, 12),
    hash,
    created_at: new Date().toISOString(),
    revoked: false,
  };

  agent.api.keys.push(apiKey);
  saveAgent(agent);

  return { key: fullKey, apiKey };
}

/** Revoke an API key by id. */
export function revokeApiKey(agentId: string, keyId: string): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;
  const key = agent.api.keys.find((k) => k.id === keyId);
  if (!key) return false;
  key.revoked = true;
  saveAgent(agent);
  return true;
}

/** Validate an API key against all agents. Returns the agent if valid. */
export async function validateApiKey(
  rawKey: string,
): Promise<AgentConfig | null> {
  const hash = await sha256(rawKey);
  for (const agent of listAgents()) {
    if (!agent.api.enabled) continue;
    const match = agent.api.keys.find(
      (k) => k.hash === hash && !k.revoked,
    );
    if (match) {
      // Update last_used_at
      match.last_used_at = new Date().toISOString();
      agent.api.usage.total_requests++;
      saveAgent(agent);
      return agent;
    }
  }
  return null;
}
