// ═══════════════════════════════════════════════════════════════
//  Connectors — project-scoped outbound action channels.
//
//  A connector = "a pre-wired MCP surface with credentials baked in".
//  Where datasources are read handles into external data, connectors
//  are write handles into external actions (post Slack, create GitHub
//  issue, draft Notion page, …). Each connector file bundles:
//    • type + config fields (auth, workspace, defaults)
//    • an `actions` list declaring what verbs the connector exposes
//    • `_demo_note` — honest degradation text shown to the agent
//
//  Runtime shape is the same as datasources: scan the project dir,
//  register one in-process SDK MCP tool per installed connector
//  (a single generic `<slug>_invoke` tool that accepts `action` +
//  `params`), return an echoed demo-mode response so the agent can
//  observably "call out" without actually hitting a live backend.
//
//  The demo deliberately stops short of ever making a real HTTP
//  request: that keeps the project-folder-is-ground-truth principle
//  intact (no hidden network state), and avoids the auth/secret
//  management tangle. Swapping any one handler for a live one is a
//  local change that doesn't touch the fixture / panel / MCP layer.
// ═══════════════════════════════════════════════════════════════

import { readdir, mkdir, writeFile, rm } from "fs/promises";
import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

// ── Types ────────────────────────────────────────────────────

export interface ConnectorAction {
  name: string;
  description: string;
}

export interface ConnectorFile {
  type: string;
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status?: "connected" | "needs_auth" | "disabled";
  /**
   * Free-form config blob. Fields prefixed with `_` are treated as
   * secrets in UI and redacted on the wire (the agent/MCP layer
   * should never receive raw tokens). For the demo everything is
   * already mock, so redaction is cosmetic.
   */
  config?: Record<string, unknown>;
  actions?: ConnectorAction[];
  _demo_note?: string;
}

// ── Loaders ──────────────────────────────────────────────────

const FIXTURES_DIR = resolve(import.meta.dir, "../fixtures/connectors");

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await Bun.file(path).text()) as T;
  } catch {
    return null;
  }
}

async function scanConnectorDir(dir: string): Promise<ConnectorFile[]> {
  if (!existsSync(dir)) return [];
  const out: ConnectorFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = await scanConnectorDir(join(dir, entry.name));
      out.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const data = await readJsonFile<ConnectorFile>(join(dir, entry.name));
      if (data && data.id && data.type) out.push(data);
    }
  }
  return out;
}

export async function loadConnectorCatalog(): Promise<ConnectorFile[]> {
  const list = await scanConnectorDir(FIXTURES_DIR);
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

function projectConnectorsDir(projectDir: string): string {
  return join(projectDir, ".claude", "connectors");
}

export async function listConnectors(
  projectDir: string,
): Promise<ConnectorFile[]> {
  const list = await scanConnectorDir(projectConnectorsDir(projectDir));
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listConnectorCatalogWithStatus(
  projectDir: string,
): Promise<Array<ConnectorFile & { installed: boolean }>> {
  const [catalog, installed] = await Promise.all([
    loadConnectorCatalog(),
    listConnectors(projectDir),
  ]);
  const installedIds = new Set(installed.map((c) => c.id));
  return catalog.map((c) => ({ ...c, installed: installedIds.has(c.id) }));
}

export async function getConnector(
  projectDir: string,
  id: string,
): Promise<ConnectorFile | null> {
  const proj = await listConnectors(projectDir);
  const hit = proj.find((c) => c.id === id);
  if (hit) return hit;
  const catalog = await loadConnectorCatalog();
  return catalog.find((c) => c.id === id) ?? null;
}

// ── Install / uninstall ──────────────────────────────────────

function projectPathForId(projectDir: string, id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_\-/.]/g, "_");
  return join(projectConnectorsDir(projectDir), `${safe}.json`);
}

export async function installConnectorFromCatalog(
  projectDir: string,
  id: string,
): Promise<ConnectorFile> {
  const catalog = await loadConnectorCatalog();
  const src = catalog.find((c) => c.id === id);
  if (!src) throw new Error(`Catalog entry not found: ${id}`);
  const destPath = projectPathForId(projectDir, id);
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, JSON.stringify(src, null, 2), "utf-8");
  return src;
}

export async function uninstallConnector(
  projectDir: string,
  id: string,
): Promise<void> {
  const path = projectPathForId(projectDir, id);
  if (existsSync(path)) await rm(path);
}

// ── Runtime: MCP exposure ────────────────────────────────────

/**
 * Generate a safe tool name from a connector id.
 * `slack/finance_notify` → `connector_slack_finance_notify_invoke`
 */
function toolNameFor(id: string): string {
  const slug = id.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  return `connector_${slug}_invoke`;
}

/**
 * Redact secret-looking fields before sending config into the
 * agent's view. Fields that start with `_` are dropped; everything
 * else passes through. Keeps the demo honest about "the agent
 * doesn't get the raw token."
 */
function redactConfig(
  cfg: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!cfg) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Build an in-process MCP server that exposes one generic `invoke`
 * tool per installed connector, plus a top-level `list_connectors`
 * discovery tool. The invoke handler is intentionally dumb: it
 * returns an echo envelope with `_demo_note` so the agent can
 * observably "do the action" and disclose the degradation in its
 * final reply.
 *
 * We rescan on construction (once per agent turn) rather than
 * per-tool-call — changing connector wiring mid-turn would be
 * surprising.
 */
export async function buildConnectorMcp(projectDir: string) {
  const installed = await listConnectors(projectDir);

  const invokeTools = installed.map((conn) =>
    tool(
      toolNameFor(conn.id),
      `Invoke an action on the "${conn.display_name || conn.name}" connector (${conn.type}). ${conn.description}\n\nAvailable actions: ${(conn.actions || []).map((a) => `${a.name} (${a.description})`).join("; ") || "(none declared)"}.\n\nIMPORTANT: this connector is in demo mode. Calling it logs the action and returns an echoed envelope rather than actually hitting the live backend. The response will contain a \`_demo_note\` that you MUST surface in your final reply so the user knows no real side effect occurred.`,
      {
        action: z
          .string()
          .describe(
            "The action name to invoke — must match one of the connector's declared actions.",
          ),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Parameters for the action. Structure depends on the action (e.g. Slack post_message wants { channel, text }).",
          ),
      },
      async ({ action, params }) => {
        const envelope = {
          status: "demo_mode_acknowledged",
          connector_id: conn.id,
          connector_type: conn.type,
          action,
          received_params: params ?? {},
          effective_config: redactConfig(conn.config),
          _demo_note:
            conn._demo_note ||
            `[${conn.type}] This connector is a demo stub — the call has been logged and is being returned verbatim instead of hitting a live backend. You must disclose this to the user in your final reply.`,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(envelope, null, 2),
            },
          ],
        };
      },
    ),
  );

  const listTool = tool(
    "list_connectors",
    "List every outbound connector installed in the current project. Returns connector ids, types, descriptions, and the actions each one exposes. Call this first to discover what external systems the agent can act upon.",
    {},
    async () => {
      const fresh = await listConnectors(projectDir);
      const summary = fresh.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.display_name || c.name,
        description: c.description,
        status: c.status,
        actions: c.actions || [],
        is_demo: !!c._demo_note,
        tool_name: toolNameFor(c.id),
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ connectors: summary }, null, 2),
          },
        ],
      };
    },
  );

  return createSdkMcpServer({
    name: "unispace_connectors",
    version: "0.1.0",
    tools: [listTool, ...invokeTools],
  });
}
