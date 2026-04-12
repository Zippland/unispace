// Admin API client — B-side management endpoints.
// Completely independent from the C-side (Mira workspace) API.

const BASE = "/api/admin";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.code && body.code !== "SUCC") {
    throw new Error(body.message || body.code);
  }
  return body.data ?? body;
}

// ── Traces ──────────────────────────────────────────────────

export async function fetchTraces(params: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  if (params.search) q.set("search", params.search);
  const qs = q.toString();
  return json<{ traces: any[]; total: number }>(
    `${BASE}/traces${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchTraceDetail(traceId: string) {
  return json<{ root: any; children: any[] }>(
    `${BASE}/traces/${traceId}`,
  );
}

export async function fetchSpanDetail(traceId: string, spanId: string) {
  return json<any>(`${BASE}/traces/${traceId}/spans/${spanId}`);
}

export async function fetchSpanChildren(
  traceId: string,
  spanId: string,
) {
  return json<any[]>(
    `${BASE}/traces/${traceId}/spans/${spanId}/children`,
  );
}

// ── B-side Agents ───────────────────────────────────────────

// ── Types ───────────────────────────────────────────────────

export interface MountConfig {
  source: string;
  target: string;
  mode: "ro" | "rw";
}

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
}

export interface EnvironmentConfig {
  runtimes: string[];
  network: "open" | "restricted";
  network_allowlist: string[];
  mounts: MountConfig[];
  mcp_servers: McpServerConfig[];
  env_vars: Record<string, string>;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

export interface ApiConfig {
  enabled: boolean;
  keys: ApiKey[];
  rate_limit: number;
  usage: {
    total_requests: number;
    total_tokens: number;
    last_reset: string;
  };
}

export interface SkillDef {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
}

export interface SubagentDef {
  name: string;
  description: string;
  prompt: string;
}

export interface CommandDef {
  name: string;
  description: string;
  body: string;
}

export interface DefaultFile {
  path: string;
  content: string;
}

export interface DispatchConfig {
  enabled: boolean;
  platform: "feishu";
  app_id: string;
  app_secret: string;
  bot_name: string;
  welcome_message: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  published: boolean;
  bu: string;
  author: string;
  system_prompt: string;
  model: string;
  skills: SkillDef[];
  subagents: SubagentDef[];
  commands: CommandDef[];
  default_files: DefaultFile[];
  environment: EnvironmentConfig;
  api: ApiConfig;
  dispatch?: DispatchConfig;
  created_at: string;
  updated_at: string;
}

export async function fetchAgents(): Promise<AgentConfig[]> {
  return json<AgentConfig[]>(`${BASE}/agents`);
}

export async function fetchAgent(id: string): Promise<AgentConfig> {
  return json<AgentConfig>(`${BASE}/agents/${id}`);
}

export async function createAgent(
  data: Partial<AgentConfig>,
): Promise<AgentConfig> {
  return json<AgentConfig>(`${BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateAgent(
  id: string,
  data: Partial<AgentConfig>,
): Promise<AgentConfig> {
  return json<AgentConfig>(`${BASE}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await json<void>(`${BASE}/agents/${id}`, { method: "DELETE" });
}

// ── API Keys ────────────────────────────────────────────────

export async function createApiKey(
  agentId: string,
  name: string,
): Promise<{ key: string; apiKey: ApiKey }> {
  return json<{ key: string; apiKey: ApiKey }>(
    `${BASE}/agents/${agentId}/keys`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
}

export async function revokeApiKey(
  agentId: string,
  keyId: string,
): Promise<void> {
  await json<void>(`${BASE}/agents/${agentId}/keys/${keyId}`, {
    method: "DELETE",
  });
}
