import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import * as api from "../api";
import {
  mergeTemplates,
  type SeedTemplate,
} from "../mira/templateSeed";

// ═══════════════════════════════════════════════════════════════
//  ProjectWelcome — the BU-federated project template gallery.
//  Shows when the user is in Project mode without a current
//  project OR explicitly asks for "+ New Project".
// ═══════════════════════════════════════════════════════════════

interface Props {
  /** Called after a new project is created (by name) so the parent
   *  can switch the current project and refresh state. */
  onProjectCreated: (name: string) => Promise<void> | void;
  /** Optional close handler — when rendered as takeover with a project
   *  already active, the user can back out. */
  onClose?: () => void;
  /** If provided, auto-open the create-project confirm dialog for this
   *  template as soon as the gallery mounts. Used by ChatPanel's empty
   *  state "start from template" strip to jump straight to the confirm. */
  initialTemplate?: api.ProjectTemplate;
}

// Demo BU list — order matters (Explore is pinned first)
const BU_TABS = [
  { key: "explore", label: "Explore" },
  { key: "finance", label: "Finance" },
  { key: "hr", label: "HR" },
  { key: "da", label: "DA" },
  { key: "pmo", label: "PMO" },
  { key: "legal", label: "Legal" },
  { key: "rd", label: "R&D" },
  { key: "design", label: "Design" },
  { key: "community", label: "Community" },
] as const;

// Each BU gets a stable pill color — BUs that have templates get a visible
// tag; empty BUs show muted.
const BU_COLORS: Record<string, string> = {
  finance: "#d97757",
  hr: "#7c9a5e",
  da: "#a07cc5",
  pmo: "#6a9bcc",
  legal: "#9b8757",
  rd: "#507a96",
  design: "#c4688a",
  community: "#5a8d7a",
};

function buColor(bu: string) {
  return BU_COLORS[bu] || "#b0aea5";
}

// Default project name suggestion for a template. Shared by openConfirm
// (user clicks a card) and the initialTemplate useEffect (parent preselected
// a template). Blank gets a dedicated prefix because its id has no "/" and
// a naive `${bu}-${id.split("/")[1]}` produces "community-undefined-XXX".
function defaultPendingName(tmpl: { id: string; bu: string }): string {
  const suffix = Math.floor(Math.random() * 900 + 100);
  if (tmpl.id === "__blank__") return `blank-${suffix}`;
  const slug = tmpl.id.split("/")[1] || tmpl.id;
  return `${tmpl.bu}-${slug}-${suffix}`;
}

export default function ProjectWelcome({
  onProjectCreated,
  onClose,
  initialTemplate,
}: Props) {
  const { serverUrl } = useStore();
  const [real, setReal] = useState<api.ProjectTemplate[]>([]);
  const [activeBU, setActiveBU] = useState<string>("explore");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Confirm dialog state
  const [pending, setPending] = useState<SeedTemplate | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .fetchTemplates(serverUrl)
      .then((list) => {
        if (!cancelled) setReal(list);
      })
      .catch(() => {
        if (!cancelled) setReal([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl]);

  // Seed + real merged list (seed order preserved, real overlays)
  const templates = useMemo(() => mergeTemplates(real), [real]);

  // If the parent handed us a preselected template, jump straight to the
  // confirm dialog on first mount. Happens when the ChatPanel empty state
  // strip is clicked — user already made a choice, no need to show the
  // full gallery.
  useEffect(() => {
    if (initialTemplate && !pending) {
      setPending(initialTemplate);
      setPendingName(defaultPendingName(initialTemplate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplate]);

  const visible = useMemo(() => {
    if (activeBU === "explore") return templates;
    return templates.filter((t) => t.bu === activeBU);
  }, [templates, activeBU]);

  // Default project name suggestion when opening a template.
  // Placeholder templates (not yet published) show a toast instead.
  function openConfirm(tmpl: SeedTemplate) {
    if (tmpl.placeholder) {
      setToast(`${tmpl.name} — BU 正在审核中，稍后上线`);
      window.setTimeout(() => setToast(null), 2500);
      return;
    }
    setPending(tmpl);
    setPendingName(defaultPendingName(tmpl));
    setError("");
  }

  async function handleCreate() {
    if (!pending || !pendingName.trim()) return;
    setCreating(true);
    setError("");
    try {
      if (pending.id === "__blank__") {
        await api.createBlankProject(serverUrl, pendingName.trim());
      } else {
        await api.createProjectFromTemplate(
          serverUrl,
          pending.id,
          pendingName.trim(),
        );
      }
      await onProjectCreated(pendingName.trim());
      setPending(null);
    } catch (e: any) {
      setError(e?.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e8e6dc] bg-white px-10 py-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
                title="Back"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <h1 className="font-['Poppins',_Arial,_sans-serif] text-[20px] font-semibold text-[#141413]">
              Start a new project
            </h1>
          </div>
          <p className={`mt-2 text-[13px] leading-relaxed text-[#6b6963] ${onClose ? "pl-9" : ""}`}>
            Pick a template published by your BU, or start from a blank canvas.
            Each template ships a Main Agent, curated skills, and the recommended model.
          </p>
        </div>
      </div>

      {/* BU tab bar */}
      <div className="shrink-0 border-b border-[#e8e6dc] bg-white px-10">
        <nav className="flex items-center gap-5 overflow-x-auto">
          {BU_TABS.map((tab) => {
            const isActive = activeBU === tab.key;
            const count =
              tab.key === "explore"
                ? templates.length
                : templates.filter((t) => t.bu === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveBU(tab.key)}
                className={`relative flex items-center gap-1.5 pb-3 pt-4 text-[13px] font-medium transition ${
                  isActive
                    ? "text-[#141413]"
                    : "text-[#b0aea5] hover:text-[#6b6963]"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="rounded-full bg-[#141413]/[0.06] px-1.5 py-0.5 text-[10px] text-[#6b6963]">
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#141413]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Grid body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-10 py-8">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-[13px] text-[#b0aea5]">
              Loading templates…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Blank card — always first */}
              <BlankCard
                onClick={() =>
                  openConfirm({
                    id: "__blank__",
                    name: "Blank Project",
                    description:
                      "Empty workspace. Bring your own files, data, and customize agents as you go.",
                    author: "Mira",
                    bu: "community",
                  })
                }
              />
              {visible.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => openConfirm(t)}
                />
              ))}
              {visible.length === 0 && !loading && activeBU !== "explore" && (
                <div className="col-span-full flex h-32 items-center justify-center text-[13px] text-[#b0aea5]">
                  No templates from this BU yet. Drop a folder in{" "}
                  <span className="mx-1 font-mono">
                    project-templates/{activeBU}/
                  </span>{" "}
                  to publish one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {pending && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm"
            onClick={() => !creating && setPending(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
              Create project from template
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[22px]">{pending.icon || "📁"}</span>
              <span className="text-[13px] font-medium text-[#141413]">
                {pending.name}
              </span>
              {pending.id !== "__blank__" && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                  style={{ background: buColor(pending.bu) }}
                >
                  {pending.bu}
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#6b6963]">
              {pending.description}
            </p>

            <label className="mt-5 block text-[12px] font-medium text-[#6b6963]">
              Project name
            </label>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => {
                setPendingName(e.target.value);
                setError("");
              }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#141413]"
            />
            {error && <p className="mt-2 text-[12px] text-[#d97757]">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                disabled={creating}
                className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !pendingName.trim()}
                className="rounded-lg bg-[#141413] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2a2a28] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create project"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast for placeholder clicks */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#141413] px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Template card ────────────────────────────────────────────

function TemplateCard({
  template,
  onClick,
}: {
  template: SeedTemplate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8e6dc] bg-white text-left transition hover:border-[#b0aea5] hover:shadow-[0_8px_24px_rgba(20,20,19,0.08)]"
    >
      <div className={`aspect-[5/3] w-full bg-gradient-to-br ${template.gradient || "from-[#e8e6dc] to-[#d6c5b3]"} relative`}>
        <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-[22px] backdrop-blur-sm">
          {template.icon || "📁"}
        </div>
        <div
          className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
          style={{ background: buColor(template.bu) }}
        >
          {template.bu}
        </div>
        {template.placeholder && (
          <div className="absolute bottom-4 left-4 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-medium text-[#6b6963] backdrop-blur-sm">
            Preview
          </div>
        )}
      </div>
      <div className="flex-1 px-5 py-4">
        <div className="text-[14px] font-semibold text-[#141413]">
          {template.name}
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6b6963]">
          {template.description}
        </div>
        <div className="mt-3 text-[11px] text-[#b0aea5]">
          by {template.author}
        </div>
      </div>
    </button>
  );
}

// ── Blank project card (pinned first) ───────────────────────

function BlankCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-dashed border-[#e8e6dc] bg-[#faf9f5] text-left transition hover:border-[#b0aea5] hover:bg-white"
    >
      <div className="flex aspect-[5/3] w-full items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-[#b0aea5] text-[#b0aea5] transition group-hover:border-[#141413] group-hover:text-[#141413]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>
      <div className="flex-1 px-5 py-4">
        <div className="text-[14px] font-semibold text-[#141413]">
          Blank project
        </div>
        <div className="mt-1 text-[12px] leading-relaxed text-[#6b6963]">
          Start empty. Add files, data, and customize agents as you go.
        </div>
        <div className="mt-3 text-[11px] text-[#b0aea5]">by Mira</div>
      </div>
    </button>
  );
}
