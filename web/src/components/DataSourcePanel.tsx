import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchDatasources,
  fetchDatasourceCatalog,
  installDatasource,
  uninstallDatasource,
  type DatasourceSummary,
  type DatasourceCatalogItem,
} from "../api";
import { useStore } from "../store";

// ═══════════════════════════════════════════════════════════════
//  DataSourcePanel — project-scoped external data handles.
//
//  Reads /api/datasources. Each datasource is a handle to an
//  external system (Aeolus / Hive / lark_sheet / ...); the agent
//  queries them via the in-process `unispace_datasources` MCP
//  server exposed by server/src/datasources.ts.
//
//  Grouping: by `type` string from the backend. Types not in
//  TYPE_META fall back to a generic visual.
// ═══════════════════════════════════════════════════════════════

// ── Icon paths (Heroicons 24 outline) ─────────────────────────

const ICON_SIGNAL =
  "M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z";

const ICON_DB =
  "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125";

const ICON_TABLE =
  "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5";

const ICON_CHART =
  "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z";

// ── Type metadata (UI-only; backend doesn't care) ────────────

interface TypeMeta {
  label: string;
  hint: string;
  color: string;
  icon: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  aeolus: {
    label: "Aeolus",
    hint: "TikTok for Business 数据集",
    color: "#788c5d",
    icon: ICON_SIGNAL,
  },
  "cis-core": {
    label: "CIS Core",
    hint: "财务门户语义模型",
    color: "#4f7f8f",
    icon: ICON_DB,
  },
  hive: {
    label: "Hive",
    hint: "Coral 库表",
    color: "#d97757",
    icon: ICON_DB,
  },
  lark_sheet: {
    label: "飞书表格",
    hint: "通过表格链接导入",
    color: "#4e7ab5",
    icon: ICON_TABLE,
  },
  sentry: {
    label: "Sentry",
    hint: "已授权的数据集",
    color: "#6a9bcc",
    icon: ICON_CHART,
  },
};

const UNKNOWN_META: TypeMeta = {
  label: "Other",
  hint: "自定义数据源",
  color: "#8d8a80",
  icon: ICON_DB,
};

// Stable display order for type groups (matches the old seed).
const TYPE_ORDER = ["aeolus", "cis-core", "hive", "lark_sheet", "sentry"];

function typeMeta(type: string): TypeMeta {
  return TYPE_META[type] || UNKNOWN_META;
}

// ── Region badge styles ───────────────────────────────────────

const REGION_STYLES: Record<string, { color: string; background: string }> = {
  sg: { color: "#3b7f6a", background: "#3b7f6a14" },
  va: { color: "#b86b35", background: "#b86b3514" },
  cn: { color: "#788c5d", background: "#788c5d14" },
};

// ── Panel ─────────────────────────────────────────────────────

export default function DataSourcePanel({
  pickerOpen,
  onClosePicker,
}: {
  pickerOpen: boolean;
  onClosePicker: () => void;
}) {
  const { serverUrl, connected, currentProject } = useStore();
  const [items, setItems] = useState<DatasourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Refetch whenever the current project changes — datasource list is
  // scoped to `<project>/.claude/datasources/` on the server side.
  const refresh = useCallback(() => {
    if (!connected) return;
    setLoading(true);
    fetchDatasources(serverUrl)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [serverUrl, connected]);

  useEffect(() => {
    refresh();
  }, [refresh, currentProject]);

  async function handleUninstall(id: string) {
    try {
      await uninstallDatasource(serverUrl, id);
      refresh();
    } catch {
      // intentionally quiet — show case, not a production flow
    }
  }

  // Group by type, ordered by TYPE_ORDER then alpha fallback.
  const groups = useMemo(() => {
    const byType = new Map<string, DatasourceSummary[]>();
    for (const d of items) {
      if (!byType.has(d.type)) byType.set(d.type, []);
      byType.get(d.type)!.push(d);
    }
    const orderedTypes = [
      ...TYPE_ORDER.filter((t) => byType.has(t)),
      ...[...byType.keys()].filter((t) => !TYPE_ORDER.includes(t)).sort(),
    ];
    return orderedTypes.map((t) => ({
      type: t,
      meta: typeMeta(t),
      items: byType.get(t)!,
    }));
  }, [items]);

  function toggle(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  return (
    <div className="px-2 pb-2">
      {loading && items.length === 0 && (
        <p className="px-3 py-4 text-[11px] text-[#b0aea5]">Loading…</p>
      )}

      {!loading && groups.length === 0 && (
        <div className="px-3 py-4 text-[11px] leading-relaxed text-[#b0aea5]">
          No datasources in this project yet. Click the{" "}
          <span className="font-medium text-[#6b6963]">+</span> button in the
          Datasource tab header to install one from the catalog.
        </div>
      )}

      {groups.map((g) => {
        const isCollapsed = !!collapsed[g.type];
        return (
          <div key={g.type} className="mb-1">
            <button
              onClick={() => toggle(g.type)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] transition hover:bg-[#faf9f5]"
            >
              <svg
                className="h-4 w-4 shrink-0"
                style={{ color: g.meta.color }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={g.meta.icon} />
              </svg>
              <span className="font-medium text-[#141413]">{g.meta.label}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: g.meta.color, backgroundColor: `${g.meta.color}14` }}
              >
                {g.items.length}
              </span>
              <svg
                className={`ml-auto h-3 w-3 text-[#b0aea5] transition-transform ${
                  isCollapsed ? "" : "rotate-180"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
            {!isCollapsed &&
              g.items.map((item) => {
                const displayName = item.display_name || item.name;
                const regionStyle = item.region
                  ? REGION_STYLES[item.region]
                  : undefined;
                return (
                  <div
                    key={item.id}
                    draggable
                    title={item.description}
                    onDragStart={(e) => {
                      // Drag payload consumed by ChatPanel's handleInputDrop.
                      // `path` carries the datasource id — ChatPanel uses it
                      // to dedupe attachments and the agent's query_datasource
                      // tool consumes the same id.
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          type: "datasource",
                          path: item.id,
                          id: item.id,
                          name: displayName,
                          label: displayName,
                          description: item.description,
                        }),
                      );
                      e.dataTransfer.setData("x-unispace-drag", "datasource");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="group flex cursor-grab items-center gap-2 rounded-lg py-1.5 pl-8 pr-2 text-[13px] transition hover:bg-[#faf9f5]"
                  >
                    {regionStyle && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          color: regionStyle.color,
                          backgroundColor: regionStyle.background,
                        }}
                      >
                        {item.region}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[#141413]">
                      {displayName}
                    </span>
                    {item.is_demo_sample && (
                      <span
                        className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#b0aea5]"
                        title="Cached demo sample"
                      >
                        sample
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstall(item.id);
                      }}
                      className="hidden h-4 w-4 shrink-0 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] group-hover:flex"
                      title="Remove from project"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
          </div>
        );
      })}

      <p className="mt-3 px-3 text-[11px] leading-relaxed text-[#b0aea5]">
        Drag a datasource into the chat input — the agent will use the
        `query_datasource` tool to read it.
      </p>

      {pickerOpen && (
        <DataSourcePicker
          onClose={onClosePicker}
          onInstalled={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DataSourcePicker — browse the bundled catalog and install into
//  the current project. Each catalog entry is a complete fixture
//  (schema + sample rows + demo note); clicking "Use this" copies
//  the file into `<project>/.claude/datasources/<type>/<name>.json`
//  and refreshes the panel list.
//
//  Entries already present in the project show an "Installed" badge
//  and a disabled button. The dialog pulls fresh catalog state on
//  every open and after each install.
// ═══════════════════════════════════════════════════════════════

function DataSourcePicker({
  onClose,
  onInstalled,
}: {
  onClose: () => void;
  onInstalled: () => void;
}) {
  const { serverUrl } = useStore();
  const [catalog, setCatalog] = useState<DatasourceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(TYPE_ORDER[0]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchDatasourceCatalog(serverUrl)
      .then(setCatalog)
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [serverUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byType = useMemo(() => {
    const m = new Map<string, DatasourceCatalogItem[]>();
    for (const d of catalog) {
      if (!m.has(d.type)) m.set(d.type, []);
      m.get(d.type)!.push(d);
    }
    return m;
  }, [catalog]);

  const activeMeta = typeMeta(selected);
  const activeItems = byType.get(selected) || [];

  async function handleInstall(id: string) {
    setBusy(id);
    try {
      await installDatasource(serverUrl, id);
      await Promise.all([
        fetchDatasourceCatalog(serverUrl).then(setCatalog),
      ]);
      onInstalled();
    } catch {
      // intentionally quiet
    }
    setBusy(null);
  }

  async function handleUninstall(id: string) {
    setBusy(id);
    try {
      await uninstallDatasource(serverUrl, id);
      await fetchDatasourceCatalog(serverUrl).then(setCatalog);
      onInstalled();
    } catch {
      // quiet
    }
    setBusy(null);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[560px] w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <div className="border-b border-[#e8e6dc] px-6 pt-5 pb-4">
          <h3 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
            Connect a data source
          </h3>
          <p className="mt-1 text-[11px] text-[#b0aea5]">
            Install a datasource into this project — the agent can query it
            via the <code className="rounded bg-[#faf9f5] px-1">query_datasource</code> tool.
          </p>

          {/* Type pill bar */}
          <div className="mt-4 flex gap-0.5 rounded-[12px] bg-[#eeebe3] p-1">
            {TYPE_ORDER.map((type) => {
              const meta = typeMeta(type);
              const isSel = type === selected;
              const count = (byType.get(type) || []).length;
              return (
                <button
                  key={type}
                  onClick={() => setSelected(type)}
                  className="flex flex-1 items-center justify-center gap-1.5 truncate rounded-[8px] py-1.5 text-[11px] font-medium transition"
                  style={
                    isSel
                      ? {
                          backgroundColor: "white",
                          color: meta.color,
                          boxShadow: "0 1px 4px rgba(20,20,19,0.08)",
                        }
                      : { color: "#8d8a80" }
                  }
                >
                  <span>{meta.label}</span>
                  {count > 0 && (
                    <span
                      className="rounded-full px-1 text-[9px] font-bold"
                      style={{
                        color: isSel ? meta.color : "#b0aea5",
                        backgroundColor: isSel
                          ? `${meta.color}14`
                          : "#d8d5cc33",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="py-8 text-center text-[12px] text-[#b0aea5]">
              Loading catalog…
            </p>
          )}

          {!loading && activeItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e8e6dc] bg-[#fffdf8] p-8 text-center">
              <div
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${activeMeta.color}14`,
                  color: activeMeta.color,
                }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={activeMeta.icon}
                  />
                </svg>
              </div>
              <div className="text-[13px] font-semibold text-[#141413]">
                No {activeMeta.label} samples yet
              </div>
              <div className="mt-1 text-[11px] text-[#b0aea5]">
                {activeMeta.hint}
              </div>
            </div>
          )}

          {!loading &&
            activeItems.map((item) => (
              <div
                key={item.id}
                className="mb-3 flex items-start gap-3 rounded-xl border border-[#e8e6dc] bg-white p-4 transition hover:border-[#b0aea5]"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${activeMeta.color}14`,
                    color: activeMeta.color,
                  }}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={activeMeta.icon}
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#141413]">
                      {item.display_name || item.name}
                    </span>
                    {item.region && REGION_STYLES[item.region] && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                        style={{
                          color: REGION_STYLES[item.region].color,
                          backgroundColor:
                            REGION_STYLES[item.region].background,
                        }}
                      >
                        {item.region}
                      </span>
                    )}
                    {item.is_demo_sample && (
                      <span
                        className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#b0aea5]"
                        title="Cached demo sample — reads from local fixture, does not hit a live backend"
                      >
                        sample
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6b6963]">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#b0aea5]">
                    <span>{item.schema.dimensions.length} dims</span>
                    <span>·</span>
                    <span>{item.schema.metrics.length} metrics</span>
                  </div>
                </div>
                {item.installed ? (
                  <button
                    onClick={() => handleUninstall(item.id)}
                    disabled={busy === item.id}
                    className="shrink-0 rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-[11px] font-medium text-[#6b6963] transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                  >
                    Installed · Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(item.id)}
                    disabled={busy === item.id}
                    className="shrink-0 rounded-lg bg-[#141413] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50"
                  >
                    {busy === item.id ? "…" : "Use this"}
                  </button>
                )}
              </div>
            ))}

          {!loading && (
            <div className="mt-4 rounded-lg border border-dashed border-[#e8e6dc] bg-[#faf9f5] p-3 text-center text-[10px] leading-relaxed text-[#b0aea5]">
              Custom connector form (填 token / spreadsheet link / etc.) —{" "}
              <span className="font-medium">preview only</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e8e6dc] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[12px] text-[#6b6963] transition hover:bg-[#faf9f5]"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
