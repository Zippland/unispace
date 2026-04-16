import { useState, useEffect, useCallback } from "react";
import {
  fetchTasks,
  saveTask,
  deleteTask,
  runTask,
  type TaskFile,
  type TaskTrigger,
  type TaskStatus,
  type SaveTaskInput,
} from "../api";
import { useStore } from "../store";

// ═══════════════════════════════════════════════════════════════
//  ProjectTasksPanel — kanban board with 3 columns:
//    Backlog  |  Planned  |  Running
//
//  Each task is a card. Users can create tasks, change status,
//  edit, delete, and run them. Agent-created tasks get a
//  "Mira Recommend" badge.
// ═══════════════════════════════════════════════════════════════

const COLUMNS: { key: TaskStatus; label: string; icon: string; color: string; bg: string }[] = [
  { key: "backlog",  label: "Backlog",  icon: "\u{1F4CB}", color: "#6b6963", bg: "rgba(107,105,99,0.06)" },
  { key: "planned",  label: "Planned",  icon: "\u{1F4C5}", color: "#4e7ab5", bg: "rgba(78,122,181,0.06)" },
  { key: "running",  label: "Running",  icon: "\u25B6",    color: "#7c9a5e", bg: "rgba(124,154,94,0.06)" },
];

const TRIGGER_LABEL: Record<TaskTrigger, string> = {
  manual: "Manual",
  fixed: "Fixed",
  model: "Model",
};

export default function ProjectTasksPanel() {
  const { serverUrl, connected, currentProject, setActiveSession, setActiveTab } = useStore();
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

  useEffect(() => { refresh(); }, [refresh, currentProject]);

  async function handleRun(task: TaskFile) {
    setRunning(task.name);
    try {
      const { session_id } = await runTask(serverUrl, task.name);
      setActiveSession(session_id);
      setActiveTab(null);
    } catch (e) {
      console.error("Run failed:", e);
    }
    setRunning(null);
    setTimeout(refresh, 400);
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete task "${name}"?`)) return;
    try { await deleteTask(serverUrl, name); refresh(); } catch {}
  }

  async function handleStatusChange(task: TaskFile, status: TaskStatus) {
    try {
      await saveTask(serverUrl, { ...task, status });
      refresh();
    } catch {}
  }

  async function handleSave(input: SaveTaskInput) {
    await saveTask(serverUrl, input);
    setEditing(null);
    setCreating(false);
    refresh();
  }

  const grouped: Record<TaskStatus, TaskFile[]> = { backlog: [], planned: [], running: [] };
  for (const t of tasks) {
    (grouped[t.status] || grouped.backlog).push(t);
  }

  return (
    <>
      {/* "+ New task" button */}
      <div className="flex justify-end pb-3">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1.5 text-[11px] text-[#141413] transition hover:border-[#b0aea5]"
        >
          <svg className="h-3 w-3 text-[#6b6963]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New task
        </button>
      </div>

      {loading && tasks.length === 0 && (
        <p className="py-6 text-center text-[12px] text-[#b0aea5]">Loading tasks\u2026</p>
      )}

      {!loading && tasks.length === 0 && (
        <p className="py-8 text-center text-[13px] font-light text-[#9f9c93]">No project tasks yet</p>
      )}

      {tasks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: col.bg }}>
                <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: col.color }}>
                  <span className="text-[11px]">{col.icon}</span>
                  {col.label}
                </span>
                <span className="text-[11px] text-[#b0aea5]">{grouped[col.key].length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {grouped[col.key].map((task) => (
                  <TaskCard
                    key={task.name}
                    task={task}
                    colColor={col.color}
                    running={running === task.name}
                    onRun={() => handleRun(task)}
                    onEdit={() => setEditing(task)}
                    onDelete={() => handleDelete(task.name)}
                    onStatusChange={(s) => handleStatusChange(task, s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TaskDialog
          task={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}

// ── TaskCard ─────────────────────────────────────────────────

function TaskCard({ task, colColor, running, onRun, onEdit, onDelete, onStatusChange }: {
  task: TaskFile;
  colColor: string;
  running: boolean;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMiraRecommend = task.source === "model";

  const bgColor = isMiraRecommend ? "bg-[#faf8f0]" : "bg-white";

  return (
    <div
      onClick={() => setMenuOpen(!menuOpen)}
      className={`group relative flex cursor-pointer rounded-xl border border-[#e8e6dc] ${bgColor} transition hover:border-[#b0aea5] hover:shadow-sm`}
    >
      {/* Left color bar */}
      <div className="w-[3px] shrink-0 rounded-l-xl" style={{ backgroundColor: colColor }} />
      <div className="flex-1 p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-[#141413]">{task.name}</h4>
        <div className="relative">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(41,41,31,0.05)] text-[#9f9c93]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </span>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 w-[140px] rounded-lg border border-[#e8e6dc] bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { onRun(); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#141413] hover:bg-[#faf9f5]">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  {running ? "Starting\u2026" : "Run"}
                </button>
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex w-full px-3 py-1.5 text-[12px] text-[#141413] hover:bg-[#faf9f5]">Edit</button>
                <div className="my-1 border-t border-[#e8e6dc]" />
                {(["backlog", "planned", "running"] as TaskStatus[]).filter((s) => s !== task.status).map((s) => (
                  <button key={s} onClick={() => { onStatusChange(s); setMenuOpen(false); }} className="flex w-full px-3 py-1.5 text-[12px] text-[#6b6963] hover:bg-[#faf9f5]">
                    Move to {s}
                  </button>
                ))}
                <div className="my-1 border-t border-[#e8e6dc]" />
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex w-full px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6b6963]">{task.description}</p>
      )}

      {task.schedule && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#b0aea5]">
          <span>\u23F0</span>
          <span>{task.schedule}</span>
        </div>
      )}

      {task.trigger !== "manual" && !task.schedule && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#b0aea5]">
          <span>\u25C7</span>
          <span>{TRIGGER_LABEL[task.trigger]}</span>
        </div>
      )}

      {isMiraRecommend && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#7c9a5e]">
          <span>{"\u{1F331}"}</span>
          <span>Mira Recommend</span>
        </div>
      )}
      </div>{/* end flex-1 p-3 */}
    </div>
  );
}

// ── TaskDialog ───────────────────────────────────────────────

function TaskDialog({ task, onClose, onSave }: {
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
        status: task?.status || "backlog",
        body,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[620px] w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
        <div className="border-b border-[#e8e6dc] px-6 pt-5 pb-4">
          <h3 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
            {isEdit ? `Edit task \u00B7 ${task.name}` : "New project task"}
          </h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-[11px] font-medium text-[#141413]">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit} placeholder="weekly_report"
              className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none focus:border-[#141413] disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#141413]">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Generate a weekly business summary"
              className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none focus:border-[#141413]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#141413]">Trigger</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["manual", "fixed", "model"] as const).map((t) => {
                const isSel = trigger === t;
                return (
                  <button key={t} onClick={() => setTrigger(t)}
                    className={`rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition ${isSel ? "border-[#141413] bg-[#faf9f5]" : "border-[#e8e6dc]"}`}>
                    {TRIGGER_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </div>
          {trigger === "fixed" && (
            <div>
              <label className="block text-[11px] font-medium text-[#141413]">Cron schedule</label>
              <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 9 * * MON"
                className="mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-[12px] text-[#141413] outline-none focus:border-[#141413]" />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-medium text-[#141413]">Prompt body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="What should the agent do when this task fires?"
              className="mt-1 w-full resize-none rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-[12px] leading-relaxed text-[#141413] outline-none focus:border-[#141413]" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e8e6dc] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[12px] text-[#6b6963] transition hover:bg-[#faf9f5]">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !body.trim()}
            className="rounded-lg bg-[#141413] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50">
            {saving ? "Saving\u2026" : isEdit ? "Save" : "Create task"}
          </button>
        </div>
      </div>
    </>
  );
}
