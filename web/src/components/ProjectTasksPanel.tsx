import { useState, useEffect, useCallback } from "react";
import {
  fetchTasks,
  saveTask,
  deleteTask,
  runTask,
  type TaskFile,
  type TaskTrigger,
  type SaveTaskInput,
} from "../api";
import { useStore } from "../store";

// ═══════════════════════════════════════════════════════════════
//  ProjectTasksPanel — project-scoped preset workflows.
//
//  A task = prompt + trigger declaration, stored in
//  `<project>/.claude/tasks/<name>.md` and rendered here. The
//  "Run now" button is the only path that actually fires a task
//  in the current demo — the scheduler is intentionally absent.
//  The trigger field (manual / fixed / model) is exposed in UI
//  so the product shape is visible, and carries a small
//  "auto-trigger preview" badge so observers understand the
//  demo doesn't run schedulers in the background.
// ═══════════════════════════════════════════════════════════════

// ── Trigger display metadata ─────────────────────────────────

interface TriggerMeta {
  label: string;
  tagline: string;
  color: string;
  bg: string;
}

const TRIGGER_META: Record<TaskTrigger, TriggerMeta> = {
  manual: {
    label: "Manual",
    tagline: "Run by hand whenever you need it.",
    color: "#6b6963",
    bg: "#eeece8",
  },
  fixed: {
    label: "Fixed schedule",
    tagline: "Runs on a user-defined cron.",
    color: "#4e7ab5",
    bg: "#4e7ab514",
  },
  model: {
    label: "Model-scheduled",
    tagline:
      "The agent decides when to wake itself up next. Re-set after every run.",
    color: "#d97757",
    bg: "#d9775714",
  },
};

function triggerMeta(t: TaskTrigger): TriggerMeta {
  return TRIGGER_META[t] || TRIGGER_META.manual;
}

// ── Date formatting ──────────────────────────────────────────

function fmtRelative(iso?: string): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const delta = Date.now() - t;
  if (delta < 0) return new Date(iso).toLocaleString("zh-CN");
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Panel ────────────────────────────────────────────────────

export default function ProjectTasksPanel() {
  const { serverUrl, connected, currentProject, setActiveSession, setActiveTab } =
    useStore();
  const [tasks, setTasks] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaskFile | null>(null);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!connected) return;
    setLoading(true);
    fetchTasks(serverUrl)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [serverUrl, connected]);

  useEffect(() => {
    refresh();
  }, [refresh, currentProject]);

  async function handleRun(task: TaskFile) {
    setRunning(task.name);
    try {
      const { session_id } = await runTask(serverUrl, task.name);
      // Switch the user into the new session so they watch it stream.
      setActiveSession(session_id);
      setActiveTab(null);
    } catch (e) {
      console.error("Run failed:", e);
    }
    setRunning(null);
    // Delayed refresh so last_run_at reflects the stamped time.
    setTimeout(refresh, 400);
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete task "${name}"?`)) return;
    try {
      await deleteTask(serverUrl, name);
      refresh();
    } catch {}
  }

  async function handleSave(input: SaveTaskInput) {
    await saveTask(serverUrl, input);
    setEditing(null);
    setCreating(false);
    refresh();
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-5xl px-10 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#b0aea5]">
            Preset prompts this project can run on demand. The agent executes
            each task as a fresh chat session.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-4 py-2 text-[12px] text-[#141413] transition hover:border-[#b0aea5]"
          >
            <svg
              className="h-3.5 w-3.5 text-[#6b6963]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New task
          </button>
        </div>

        {loading && tasks.length === 0 && (
          <p className="mt-10 text-center text-[12px] text-[#b0aea5]">
            Loading tasks…
          </p>
        )}

        {!loading && tasks.length === 0 && (
          <div className="mt-16 flex flex-col items-center">
            <div className="text-[28px]">⏰</div>
            <div className="mt-2 text-[14px] font-medium text-[#141413]">
              No project tasks yet
            </div>
            <div className="mt-1 max-w-md text-center text-[12px] text-[#b0aea5]">
              Click "New task" above to create a preset prompt this project
              can run on demand.
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {tasks.map((task) => {
              const meta = triggerMeta(task.trigger);
              const isPreviewTrigger = task.trigger !== "manual";
              return (
                <div
                  key={task.name}
                  className="group flex flex-col rounded-2xl border border-[#e8e6dc] bg-white p-5 transition hover:border-[#b0aea5]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[13px] font-semibold text-[#141413]">
                          {task.name}
                        </h3>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                          title={meta.tagline}
                        >
                          {meta.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6b6963]">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#faf9f5] px-3 py-2 font-mono text-[10px] leading-relaxed text-[#6b6963]">
                    <div className="line-clamp-3 whitespace-pre-wrap">
                      {task.body}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-[#b0aea5]">
                    <span>last run: {fmtRelative(task.last_run_at)}</span>
                    {task.schedule && (
                      <>
                        <span>·</span>
                        <span>
                          schedule: <code className="font-mono">{task.schedule}</code>
                        </span>
                      </>
                    )}
                  </div>

                  {isPreviewTrigger && (
                    <p className="mt-2 text-[10px] italic text-[#b0aea5]">
                      auto-trigger preview — demo runs on manual click only
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 border-t border-[#e8e6dc] pt-3">
                    <button
                      onClick={() => handleRun(task)}
                      disabled={running === task.name}
                      className="flex items-center gap-1.5 rounded-lg bg-[#141413] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {running === task.name ? "Starting…" : "Run now"}
                    </button>
                    <button
                      onClick={() => setEditing(task)}
                      className="rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-[11px] text-[#6b6963] transition hover:bg-[#faf9f5]"
                    >
                      Edit
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(task.name)}
                      className="rounded-lg px-2 py-1 text-[11px] text-[#b0aea5] opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <TaskDialog
          task={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ── TaskDialog ───────────────────────────────────────────────

function TaskDialog({
  task,
  onClose,
  onSave,
}: {
  task: TaskFile | null;
  onClose: () => void;
  onSave: (input: SaveTaskInput) => Promise<void>;
}) {
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [trigger, setTrigger] = useState<TaskTrigger>(task?.trigger || "manual");
  const [schedule, setSchedule] = useState(task?.schedule || "0 9 * * MON");
  const [body, setBody] = useState(task?.body || "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!task;

  async function handleSave() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        trigger,
        schedule: trigger === "fixed" ? schedule.trim() : undefined,
        body,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[620px] w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <div className="border-b border-[#e8e6dc] px-6 pt-5 pb-4">
          <h3 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
            {isEdit ? `Edit task · ${task.name}` : "New project task"}
          </h3>
          <p className="mt-1 text-[11px] text-[#b0aea5]">
            Stored as <code className="rounded bg-[#faf9f5] px-1">
              .claude/tasks/{name || "<name>"}.md
            </code>
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-[11px] font-medium text-[#141413]">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit}
              placeholder="weekly_report"
              className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none focus:border-[#141413] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#141413]">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Generate a weekly business summary"
              className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none focus:border-[#141413]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#141413]">
              Trigger
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["manual", "fixed", "model"] as const).map((t) => {
                const meta = triggerMeta(t);
                const isSel = trigger === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTrigger(t)}
                    className="flex flex-col items-start rounded-lg border px-3 py-2 text-left transition"
                    style={{
                      borderColor: isSel ? meta.color : "#e8e6dc",
                      backgroundColor: isSel ? meta.bg : "white",
                    }}
                  >
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: isSel ? meta.color : "#141413" }}
                    >
                      {meta.label}
                    </span>
                    <span className="mt-0.5 text-[9px] leading-tight text-[#b0aea5]">
                      {meta.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
            {trigger !== "manual" && (
              <p className="mt-2 text-[10px] italic text-[#b0aea5]">
                auto-trigger preview — the demo has no scheduler. The trigger
                type is saved and displayed, but every run fires via the Run
                button.
              </p>
            )}
          </div>

          {trigger === "fixed" && (
            <div>
              <label className="block text-[11px] font-medium text-[#141413]">
                Cron schedule
              </label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 9 * * MON"
                className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-[12px] text-[#141413] outline-none focus:border-[#141413]"
              />
              <p className="mt-1 text-[10px] text-[#b0aea5]">
                5-field cron format. Every Monday at 09:00 = <code>0 9 * * MON</code>
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#141413]">
              Prompt body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="What should the agent do when this task fires?"
              className="mt-1 w-full resize-none rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-[12px] leading-relaxed text-[#141413] outline-none focus:border-[#141413]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e8e6dc] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[12px] text-[#6b6963] transition hover:bg-[#faf9f5]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !body.trim()}
            className="rounded-lg bg-[#141413] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save" : "Create task"}
          </button>
        </div>
      </div>
    </>
  );
}
