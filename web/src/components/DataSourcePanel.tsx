import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
//  DataSourcePanel — demo-only sidebar panel modeled after
//  finance_agent's "数据源" list: type groups with collapsible
//  headers, seeded rows, Aeolus region badges. No backend — the
//  picker is UI-only and fires a toast on "Connect".
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

// ── Seed data ─────────────────────────────────────────────────

type Region = "sg" | "va" | "cn";

interface DataSourceItem {
  id: string;
  name: string;
  region?: Region;
}

interface DataSourceGroup {
  key: string;
  label: string;
  hint: string;
  color: string;
  icon: string;
  items: DataSourceItem[];
}

const GROUPS: DataSourceGroup[] = [
  {
    key: "aeolus",
    label: "Aeolus",
    hint: "粘贴查询链接自动识别",
    color: "#788c5d",
    icon: ICON_SIGNAL,
    items: [
      { id: "a1", name: "revenue_daily_v2", region: "sg" },
      { id: "a2", name: "ads_spend_by_channel", region: "va" },
      { id: "a3", name: "user_retention_monthly", region: "cn" },
    ],
  },
  {
    key: "cis-core",
    label: "CIS Core",
    hint: "按场景自动导入数据集",
    color: "#4f7f8f",
    icon: ICON_DB,
    items: [
      { id: "c1", name: "mira_feedback_survey" },
      { id: "c2", name: "product_launch_metrics" },
    ],
  },
  {
    key: "hive",
    label: "Hive",
    hint: "解析 Coral 表详情页",
    color: "#d97757",
    icon: ICON_DB,
    items: [
      { id: "h1", name: "dim_org_finance" },
      { id: "h2", name: "fact_txn_daily" },
    ],
  },
  {
    key: "lark_sheet",
    label: "飞书表格",
    hint: "通过表格链接导入",
    color: "#4e7ab5",
    icon: ICON_TABLE,
    items: [
      { id: "l1", name: "Q1 预算追踪" },
      { id: "l2", name: "BU OKR 登记表" },
    ],
  },
  {
    key: "sentry",
    label: "Sentry",
    hint: "选择已授权的数据集",
    color: "#6a9bcc",
    icon: ICON_CHART,
    items: [{ id: "s1", name: "mira-web errors" }],
  },
];

const REGION_STYLES: Record<Region, { color: string; background: string }> = {
  sg: { color: "#3b7f6a", background: "#3b7f6a14" },
  va: { color: "#b86b35", background: "#b86b3514" },
  cn: { color: "#788c5d", background: "#788c5d14" },
};

// ── Panel (controlled picker state lives in parent Sidebar) ──

export default function DataSourcePanel({
  pickerOpen,
  onClosePicker,
}: {
  pickerOpen: boolean;
  onClosePicker: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  function toggle(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="px-2 pb-2">
      {GROUPS.map((g) => {
        const isCollapsed = !!collapsed[g.key];
        return (
          <div key={g.key} className="mb-1">
            <button
              onClick={() => toggle(g.key)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] transition hover:bg-[#faf9f5]"
            >
              <svg
                className="h-4 w-4 shrink-0"
                style={{ color: g.color }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={g.icon} />
              </svg>
              <span className="font-medium text-[#141413]">{g.label}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ color: g.color, backgroundColor: `${g.color}14` }}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {!isCollapsed &&
              g.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-8 pr-2 text-[13px] transition hover:bg-[#faf9f5]"
                >
                  {item.region && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        color: REGION_STYLES[item.region].color,
                        backgroundColor: REGION_STYLES[item.region].background,
                      }}
                    >
                      {item.region}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[#141413]">
                    {item.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      flashToast(`${item.name} — demo, 不能删除`);
                    }}
                    className="hidden h-4 w-4 shrink-0 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] group-hover:flex"
                    title="Delete"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        );
      })}

      <p className="mt-3 px-3 text-[11px] leading-relaxed text-[#b0aea5]">
        Project agent can query these as tool calls. Demo shows layout only —
        wiring lands in v0.2.
      </p>

      {pickerOpen && (
        <DataSourcePicker
          onClose={onClosePicker}
          onPick={(g) => {
            onClosePicker();
            flashToast(`${g.label} connector — coming soon`);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#141413] px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Picker dialog ─────────────────────────────────────────────

function DataSourcePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (g: DataSourceGroup) => void;
}) {
  const [selected, setSelected] = useState<string>(GROUPS[0].key);
  const active = GROUPS.find((g) => g.key === selected) || GROUPS[0];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <h3 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
          Connect a data source
        </h3>

        {/* Type pill bar */}
        <div className="mt-4 flex gap-0.5 rounded-[12px] bg-[#eeebe3] p-1">
          {GROUPS.map((g) => {
            const isSel = g.key === selected;
            return (
              <button
                key={g.key}
                onClick={() => setSelected(g.key)}
                className="flex-1 truncate rounded-[8px] py-1.5 text-[11px] font-medium transition"
                style={
                  isSel
                    ? {
                        backgroundColor: "white",
                        color: g.color,
                        boxShadow: "0 1px 4px rgba(20,20,19,0.08)",
                      }
                    : { color: "#8d8a80" }
                }
              >
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Active card */}
        <div className="mt-5 rounded-xl border border-[#e8e6dc] bg-[#fffdf8] p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${active.color}14`, color: active.color }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={active.icon} />
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#141413]">
                {active.label}
              </div>
              <div className="text-[12px] text-[#6b6963]">{active.hint}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-[#e8e6dc] bg-white px-3 py-6 text-center text-[11px] text-[#b0aea5]">
            Connector form preview — demo only
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5]"
          >
            Cancel
          </button>
          <button
            onClick={() => onPick(active)}
            className="rounded-lg bg-[#141413] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2a2a28]"
          >
            Connect
          </button>
        </div>
      </div>
    </>
  );
}
