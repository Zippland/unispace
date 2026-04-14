// ═══════════════════════════════════════════════════════════════
//  Datasources — the project-scoped list of external data handles
//  the agent can query via tool calls.
//
//  Two overlay layers:
//    • catalog  — built-in samples under `server/fixtures/datasources/`,
//                 bundled with UniSpace, visible to every project
//    • project  — per-project entries under `<project>/.claude/datasources/`,
//                 override catalog entries with the same id
//
//  Every datasource file is a flat JSON with `type`, `schema`, optional
//  `sample_rows`, and a `_demo_note` string that flags the entry as a
//  cached-sample demo (the query tool forwards this note to the agent so
//  it can disclose the source in its reply).
//
//  Runtime exposure is an in-process MCP server (`buildDatasourceMcp`)
//  registered on the SDK via `options.mcpServers`. Three tools:
//    • list_datasources       — catalog summary, call first
//    • get_datasource_schema  — full schema for one id
//    • query_datasource       — returns cached sample rows + demo note
//
//  Live query handlers (real Aeolus/Hive/etc.) are out of scope for the
//  current demo — every datasource type ships as a stub that returns its
//  fixture payload. The registry layer is intentionally flat; if a real
//  handler is added later, it slots into `query_datasource` without any
//  UI or schema change.
// ═══════════════════════════════════════════════════════════════

import { readdir, mkdir, rm, writeFile } from "fs/promises";
import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

// ── Types ────────────────────────────────────────────────────

export interface DatasourceSchema {
  dimensions: Array<{
    key: string;
    label: string;
    type: string;
    values?: string[];
  }>;
  metrics: Array<{
    key: string;
    label: string;
    unit?: string;
    agg?: string;
  }>;
}

export interface DatasourceFile {
  /** type key — drives UI icon/grouping, e.g. "aeolus" / "hive" / "sentry" */
  type: string;
  /** stable id, typically `<type>/<name>` */
  id: string;
  /** machine name (slug-like) */
  name: string;
  display_name?: string;
  region?: string;
  description: string;
  /** if present, the entry is a demo sample — forwarded to agent */
  _demo_note?: string;
  schema: DatasourceSchema;
  sample_rows?: Record<string, unknown>[];
}

// ── Loaders ──────────────────────────────────────────────────

const FIXTURES_DIR = resolve(import.meta.dir, "../fixtures/datasources");

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await Bun.file(path).text();
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function scanDatasourceDir(dir: string): Promise<DatasourceFile[]> {
  if (!existsSync(dir)) return [];
  const out: DatasourceFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = await scanDatasourceDir(join(dir, entry.name));
      out.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const data = await readJsonFile<DatasourceFile>(join(dir, entry.name));
      if (data && data.id && data.type) out.push(data);
    }
  }
  return out;
}

/** Built-in datasource samples shipped with UniSpace (read from fixtures). */
export async function loadCatalog(): Promise<DatasourceFile[]> {
  const list = await scanDatasourceDir(FIXTURES_DIR);
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

/** The datasources installed into `<project>/.claude/datasources/`. */
export async function listDatasources(
  projectDir: string,
): Promise<DatasourceFile[]> {
  const list = await scanDatasourceDir(projectDatasourcesDir(projectDir));
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Catalog list with `installed` flag relative to a given project.
 * Drives the Picker UI: shows everything available, badges the ones
 * the user has already pulled into their project.
 */
export async function listCatalogWithStatus(
  projectDir: string,
): Promise<Array<DatasourceFile & { installed: boolean }>> {
  const [catalog, installed] = await Promise.all([
    loadCatalog(),
    listDatasources(projectDir),
  ]);
  const installedIds = new Set(installed.map((d) => d.id));
  return catalog.map((d) => ({ ...d, installed: installedIds.has(d.id) }));
}

/** Look up a single datasource — checks project dir first, then catalog. */
export async function getDatasource(
  projectDir: string,
  id: string,
): Promise<DatasourceFile | null> {
  const proj = await listDatasources(projectDir);
  const hit = proj.find((d) => d.id === id);
  if (hit) return hit;
  const catalog = await loadCatalog();
  return catalog.find((d) => d.id === id) ?? null;
}

// ── Install / uninstall ──────────────────────────────────────

function projectDatasourcesDir(projectDir: string): string {
  return join(projectDir, ".claude", "datasources");
}

/**
 * Resolve the on-disk filename a datasource should live at inside a
 * project. Preserves the `<type>/<name>.json` layout so the folder
 * mirrors the catalog and reads as self-documenting.
 */
function projectPathForId(projectDir: string, id: string): string {
  // id is "<type>/<name>" — use it as the path suffix directly after
  // stripping any unsafe characters for defense in depth.
  const safe = id.replace(/[^a-zA-Z0-9_\-/.]/g, "_");
  return join(projectDatasourcesDir(projectDir), `${safe}.json`);
}

/** Copy a catalog entry into the project's datasource folder. Idempotent. */
export async function installFromCatalog(
  projectDir: string,
  id: string,
): Promise<DatasourceFile> {
  const catalog = await loadCatalog();
  const src = catalog.find((d) => d.id === id);
  if (!src) throw new Error(`Catalog entry not found: ${id}`);
  const destPath = projectPathForId(projectDir, id);
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, JSON.stringify(src, null, 2), "utf-8");
  return src;
}

/** Remove an installed datasource. No-op if not installed. */
export async function uninstallDatasource(
  projectDir: string,
  id: string,
): Promise<void> {
  const path = projectPathForId(projectDir, id);
  if (existsSync(path)) await rm(path);
}

// ── MCP server ───────────────────────────────────────────────

/**
 * Build an in-process MCP server that exposes datasource tools to the
 * agent. The project directory is captured at construction time; each
 * tool call re-scans disk so edits land without a restart.
 */
export function buildDatasourceMcp(projectDir: string) {
  return createSdkMcpServer({
    name: "unispace_datasources",
    version: "0.1.0",
    tools: [
      tool(
        "list_datasources",
        "List every datasource available in the current project. Returns a summary with id, type, description, and the dimension/metric keys available on each source. Call this first to discover what data you can query.",
        {},
        async () => {
          const list = await listDatasources(projectDir);
          const summary = list.map((d) => ({
            id: d.id,
            type: d.type,
            name: d.display_name || d.name,
            description: d.description,
            region: d.region,
            dimensions: (d.schema?.dimensions || []).map((x) => x.key),
            metrics: (d.schema?.metrics || []).map((x) => x.key),
            is_demo_sample: !!d._demo_note,
          }));
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ datasources: summary }, null, 2),
              },
            ],
          };
        },
      ),

      tool(
        "get_datasource_schema",
        "Get the full schema (dimensions, metrics, allowed values, units) for one datasource. Call this before `query_datasource` to understand what fields exist and what they mean.",
        {
          id: z
            .string()
            .describe("Datasource id, e.g. 'aeolus/revenue_daily_v2'"),
        },
        async ({ id }) => {
          const ds = await getDatasource(projectDir, id);
          if (!ds) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Datasource '${id}' not found in this project.`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    id: ds.id,
                    type: ds.type,
                    name: ds.display_name || ds.name,
                    description: ds.description,
                    schema: ds.schema,
                    _demo_note: ds._demo_note,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        },
      ),

      tool(
        "query_datasource",
        "Query a datasource and return rows. Returns the full sample dataset — you apply filters and aggregations yourself in the analysis. IMPORTANT: if the response contains `_demo_note`, you MUST mention it in your final reply to the user so they know the data is a cached sample, not a live query.",
        {
          id: z
            .string()
            .describe("Datasource id, e.g. 'aeolus/revenue_daily_v2'"),
          intent: z
            .string()
            .optional()
            .describe(
              "Optional: a one-line description of what you are trying to learn. Not filtered on; purely for logging.",
            ),
        },
        async ({ id }) => {
          const ds = await getDatasource(projectDir, id);
          if (!ds) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Datasource '${id}' not found in this project.`,
                },
              ],
              isError: true,
            };
          }
          if (!ds.sample_rows || ds.sample_rows.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      id: ds.id,
                      type: ds.type,
                      _demo_note:
                        ds._demo_note ??
                        `[${ds.type}] This datasource type's live query is not wired in the current demo, and no cached sample is available. You can describe what fields exist from the schema, but cannot produce concrete numbers.`,
                      schema: ds.schema,
                      rows: [],
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    id: ds.id,
                    type: ds.type,
                    _demo_note: ds._demo_note,
                    schema: ds.schema,
                    row_count: ds.sample_rows.length,
                    rows: ds.sample_rows,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        },
      ),
    ],
  });
}
