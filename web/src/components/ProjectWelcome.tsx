import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import * as api from "../api";
import {
  mergeTemplates,
  type SeedTemplate,
} from "../mira/templateSeed";

// ═══════════════════════════════════════════════════════════════
//  CATWORK Gallery — the landing surface for project browsing.
//
//    Tab 1  "My Project"  — user's existing workspaces
//    Tab 2  "Market"      — BU-published templates from admin
//
//  Top header:  "Project" title  |  search  |  + New Project
//  Cards:       emoji + name + description + context menu
//  Brand:       Figma tokens (#29291f / #fafaf7 / #f2f2ee)
// ═══════════════════════════════════════════════════════════════

interface Props {
  onProjectCreated: (name: string) => Promise<void> | void;
  onSelectExisting?: (name: string) => Promise<void> | void;
}

// ── Helpers ───────────────────────────────────────────────────

type GalleryTab = "my_project" | "market";

const PROJECT_ICONS = ["📁", "📊", "📝", "🔬", "🎯", "💡", "🏗️", "📐", "🧩", "🗂️"];

function iconForProject(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_ICONS[h % PROJECT_ICONS.length];
}

function formatUpdated(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BU_TABS = [
  { key: "all", label: "All" },
  { key: "finance", label: "Finance" },
  { key: "hr", label: "HR" },
  { key: "da", label: "DA" },
  { key: "pmo", label: "PMO" },
  { key: "legal", label: "Legal" },
  { key: "rd", label: "R&D" },
  { key: "design", label: "Design" },
  { key: "community", label: "Community" },
] as const;

const BU_COLORS: Record<string, string> = {
  finance: "#d97757", hr: "#7c9a5e", da: "#a07cc5", pmo: "#6a9bcc",
  legal: "#9b8757", rd: "#507a96", design: "#c4688a", community: "#5a8d7a",
};

function buColor(bu: string) { return BU_COLORS[bu] || "#9f9c93"; }

function defaultPendingName(tmpl: { id: string; bu: string }): string {
  const suffix = Math.floor(Math.random() * 900 + 100);
  if (tmpl.id === "__blank__") return `blank-${suffix}`;
  const slug = tmpl.id.split("/")[1] || tmpl.id;
  return `${tmpl.bu}-${slug}-${suffix}`;
}

// ═══════════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════════

export default function ProjectWelcome({
  onProjectCreated,
  onSelectExisting,
}: Props) {
  const { serverUrl, projects } = useStore();

  const [tab, setTab] = useState<GalleryTab>("my_project");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // ── Templates (Market tab) ──────────────────────────────────
  const [real, setReal] = useState<api.ProjectTemplate[]>([]);
  const [activeBU, setActiveBU] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.fetchTemplates(serverUrl)
      .then((list) => { if (!cancelled) setReal(list); })
      .catch(() => { if (!cancelled) setReal([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [serverUrl]);

  const templates = useMemo(() => mergeTemplates(real), [real]);
  const visibleTemplates = useMemo(() => {
    let list = activeBU === "all" ? templates : templates.filter((t) => t.bu === activeBU);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [templates, activeBU, search]);

  // ── Projects (My Project tab) ───────────────────────────────
  const sortedProjects = useMemo(() => {
    let list = [...projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [projects, search]);

  // ── Create dialog ───────────────────────────────────────────
  const [pending, setPending] = useState<SeedTemplate | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function openConfirm(tmpl: SeedTemplate) {
    if (tmpl.placeholder) {
      setToast(`${tmpl.name} — BU 正在审核中，稍后上线`);
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setPending(tmpl);
    setPendingName(defaultPendingName(tmpl));
    setError("");
  }

  function openBlankConfirm() {
    openConfirm({
      id: "__blank__",
      name: "Blank Project",
      description: "Empty workspace. Bring your own files, data, and customize agents.",
      author: "Mira",
      bu: "community",
    });
  }

  async function handleCreate() {
    if (!pending || !pendingName.trim()) return;
    setCreating(true);
    setError("");
    try {
      if (pending.id === "__blank__") {
        await api.createBlankProject(serverUrl, pendingName.trim());
      } else {
        await api.createProjectFromTemplate(serverUrl, pending.id, pendingName.trim());
      }
      await onProjectCreated(pendingName.trim());
      setPending(null);
    } catch (e: any) {
      setError(e?.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  // ── Context menu ────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const closeCtx = useCallback(() => setCtxMenu(null), []);

  function handleCtxAction(action: string, name: string) {
    setCtxMenu(null);
    if (action === "rename") {
      setRenameTarget(name);
      setRenameName(name);
    } else if (action === "pin") {
      setToast(`Pinned "${name}"`);
      setTimeout(() => setToast(null), 2000);
    } else if (action === "share") {
      setToast("Share — coming soon");
      setTimeout(() => setToast(null), 2000);
    } else if (action === "delete") {
      if (window.confirm(`Delete project "${name}"? This cannot be undone.`)) {
        api.deleteProject(serverUrl, name).then(async () => {
          const resp = await api.fetchProjects(serverUrl);
          useStore.getState().setProjects(resp.projects, resp.current);
          setToast(`Deleted "${name}"`);
          setTimeout(() => setToast(null), 2000);
        });
      }
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameName.trim() || renameName === renameTarget) {
      setRenameTarget(null);
      return;
    }
    try {
      await api.cloneProject(serverUrl, renameTarget, renameName.trim());
      await api.deleteProject(serverUrl, renameTarget);
      const resp = await api.fetchProjects(serverUrl);
      useStore.getState().setProjects(resp.projects, resp.current);
      setRenameTarget(null);
    } catch (e: any) {
      setToast(`Rename failed: ${e?.message || "unknown error"}`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#fafaf7]">
      {/* ── Top header ─────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[rgba(41,41,31,0.1)] bg-white px-8 py-4">
        <h1 className="font-['Poppins',_Arial,_sans-serif] text-[16px] font-medium text-[#29291f]">
          Project
        </h1>
        <div className="flex-1" />
        {/* Search */}
        <div className="flex w-[240px] items-center gap-2 rounded-full border border-[#e3e3de] bg-white px-3 py-1.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-[#9f9c93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full border-0 bg-transparent text-[13px] text-[#29291f] outline-none placeholder:text-[#9f9c93]"
          />
        </div>
        {/* + New Project */}
        <button
          onClick={openBlankConfirm}
          className="flex items-center gap-1.5 rounded-full bg-[#29291f] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#3d3d2f]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-6 border-b border-[rgba(41,41,31,0.1)] bg-white px-8">
        {(["my_project", "market"] as const).map((t) => {
          const label = t === "my_project" ? "My Project" : "Market";
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 pt-3 text-[14px] transition ${
                active ? "font-medium text-[#29291f]" : "font-light text-[#6a685d]"
              }`}
            >
              {label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-[#333329]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-[86px] py-6">
        {tab === "my_project" ? (
          <MyProjectGrid
            projects={sortedProjects}
            onSelect={(name) => onSelectExisting?.(name)}
            onCtxMenu={setCtxMenu}
          />
        ) : (
          <MarketGrid
            templates={visibleTemplates}
            loading={loading}
            activeBU={activeBU}
            onBUChange={setActiveBU}
            onSelect={openConfirm}
          />
        )}
      </div>

      {/* ── Context menu overlay ───────────────────────────── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeCtx} />
          <div
            className="fixed z-50 w-[160px] rounded-xl border border-[rgba(41,41,31,0.1)] bg-white py-1 shadow-[0_8px_24px_rgba(20,20,19,0.12)]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {[
              { key: "rename", label: "Rename", icon: "✏️" },
              { key: "pin", label: "Pin", icon: "📌" },
              { key: "share", label: "Share", icon: "🔗" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleCtxAction(item.key, ctxMenu.name)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#29291f] transition hover:bg-[rgba(41,41,31,0.06)]"
              >
                <span className="text-[14px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="mx-3 my-1 border-t border-[rgba(41,41,31,0.1)]" />
            <button
              onClick={() => handleCtxAction("delete", ctxMenu.name)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[#d97757] transition hover:bg-[rgba(41,41,31,0.06)]"
            >
              <span className="text-[14px]">🗑️</span>
              Delete
            </button>
          </div>
        </>
      )}

      {/* ── Rename dialog ──────────────────────────────────── */}
      {renameTarget && (
        <>
          <div className="fixed inset-0 z-50 bg-[#29291f]/25 backdrop-blur-sm" onClick={() => setRenameTarget(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[16px] font-semibold text-[#29291f]">
              Rename project
            </h3>
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="mt-4 w-full rounded-lg border border-[#d6d5d0] bg-[#fafaf7] px-4 py-2.5 text-[14px] text-[#29291f] outline-none focus:border-[#29291f]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRenameTarget(null)} className="rounded-lg border border-[rgba(41,41,31,0.1)] px-4 py-2 text-[13px] text-[#6a685d] hover:bg-[rgba(41,41,31,0.06)]">
                Cancel
              </button>
              <button onClick={handleRename} className="rounded-lg bg-[#29291f] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d3d2f]">
                Rename
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Create dialog ──────────────────────────────────── */}
      {pending && (
        <>
          <div className="fixed inset-0 z-50 bg-[#29291f]/25 backdrop-blur-sm" onClick={() => !creating && setPending(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[18px] font-semibold text-[#29291f]">
              Create project
            </h3>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[28px]">{pending.icon || "📁"}</span>
              <span className="text-[15px] font-medium text-[#29291f]">{pending.name}</span>
              {pending.id !== "__blank__" && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ background: buColor(pending.bu) }}>
                  {pending.bu}
                </span>
              )}
            </div>
            <p className="mt-3 font-['Lora',_Georgia,_serif] text-[14px] leading-relaxed text-[#6a685d]">
              {pending.description}
            </p>
            <label className="mt-6 block text-[13px] font-medium text-[#6a685d]">Project name</label>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => { setPendingName(e.target.value); setError(""); }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="mt-2 w-full rounded-lg border border-[#d6d5d0] bg-[#fafaf7] px-4 py-2.5 text-[14px] text-[#29291f] outline-none focus:border-[#29291f]"
            />
            {error && <p className="mt-2 text-[12px] text-[#d97757]">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPending(null)} disabled={creating} className="rounded-lg border border-[rgba(41,41,31,0.1)] px-5 py-2.5 text-[14px] text-[#6a685d] hover:bg-[rgba(41,41,31,0.06)] disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || !pendingName.trim()} className="rounded-lg bg-[#29291f] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#3d3d2f] disabled:cursor-not-allowed disabled:opacity-50">
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ──────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#29291f] px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  My Project grid
// ═══════════════════════════════════════════════════════════════

function MyProjectGrid({
  projects,
  onSelect,
  onCtxMenu,
}: {
  projects: { name: string; updatedAt: number }[];
  onSelect: (name: string) => void;
  onCtxMenu: (m: { name: string; x: number; y: number }) => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-[14px] text-[#9f9c93]">
        No projects yet. Click <span className="mx-1 font-medium text-[#29291f]">+ New Project</span> to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard
          key={p.name}
          name={p.name}
          icon={iconForProject(p.name)}
          description={formatUpdated(p.updatedAt) ? `Updated ${formatUpdated(p.updatedAt)}` : "—"}
          onClick={() => onSelect(p.name)}
          onMenuClick={(e) => {
            e.stopPropagation();
            onCtxMenu({ name: p.name, x: e.clientX, y: e.clientY });
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Market grid (BU templates)
// ═══════════════════════════════════════════════════════════════

function MarketGrid({
  templates,
  loading,
  activeBU,
  onBUChange,
  onSelect,
}: {
  templates: SeedTemplate[];
  loading: boolean;
  activeBU: string;
  onBUChange: (bu: string) => void;
  onSelect: (t: SeedTemplate) => void;
}) {
  return (
    <>
      {/* BU filter tabs */}
      <div className="mb-5 flex items-center gap-4 overflow-x-auto">
        {BU_TABS.map((t) => {
          const active = activeBU === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onBUChange(t.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                active
                  ? "bg-[#29291f] text-white"
                  : "bg-[#f2f2ee] text-[#6a685d] hover:bg-[rgba(41,41,31,0.1)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-[13px] text-[#9f9c93]">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-[13px] text-[#9f9c93]">
          No templates found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <ProjectCard
              key={t.id}
              name={t.name}
              icon={t.icon || "📁"}
              description={t.description}
              badge="Example"
              onClick={() => onSelect(t)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Shared project card — used by both My Project and Market
// ═══════════════════════════════════════════════════════════════

function ProjectCard({
  name,
  icon,
  description,
  badge,
  onClick,
  onMenuClick,
}: {
  name: string;
  icon: string;
  description: string;
  badge?: string;
  onClick: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-[16px] rounded-[16px] border border-[rgba(41,41,31,0.1)] bg-white p-[16px] text-left transition hover:border-[#9f9c93] hover:shadow-[0_4px_20px_rgba(20,20,19,0.06)]"
    >
      {/* Icon */}
      <div className="flex size-[32px] shrink-0 items-center justify-center rounded-[6px] bg-[#f2f2ee] text-[20px]">
        {icon}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[16px] font-medium text-[#29291f]">
            {name}
          </span>
          {badge && (
            <span className="shrink-0 rounded-[6px] bg-[#f2f2ee] px-[6px] h-[20px] inline-flex items-center text-[12px] text-[#6a685d]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 h-[44px] overflow-hidden text-[14px] font-light leading-relaxed text-[#6a685d]">
          {description || "—"}
        </p>
      </div>

      {/* "..." menu trigger */}
      {onMenuClick && (
        <div
          onClick={onMenuClick}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-[#9f9c93] opacity-0 transition hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f] group-hover:opacity-100"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx={12} cy={5} r={1.5} />
            <circle cx={12} cy={12} r={1.5} />
            <circle cx={12} cy={19} r={1.5} />
          </svg>
        </div>
      )}
    </button>
  );
}
