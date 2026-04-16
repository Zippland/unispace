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
      {loading && tasks.length === 0 && (
        <p className="py-6 text-center text-[12px] text-[#b0aea5]">Loading tasks\u2026</p>
      )}

      {!loading && tasks.length === 0 && !creating && (
        <div className="flex flex-col items-center py-8">
          <p className="text-[13px] font-light text-[#9f9c93]">No project tasks yet</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1.5 text-[11px] text-[#141413] transition hover:border-[#b0aea5]"
          >
            <svg className="h-3 w-3 text-[#6b6963]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New task
          </button>
        </div>
      )}

      {(tasks.length > 0 || creating) && (
        <div className="grid grid-cols-3 gap-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col">
              {/* Column header */}
              <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: col.bg }}>
                <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: col.color }}>
                  <span className="text-[11px]">{col.icon}</span>
                  {col.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#b0aea5]">{grouped[col.key].length}</span>
                  {col.key === "backlog" && !creating && !editing && (
                    <button onClick={() => setCreating(true)} className="flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] hover:text-[#141413]" title="New task">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline create/edit card at top of backlog */}
              {col.key === "backlog" && (creating || editing) && (
                <InlineTaskEditor
                  task={editing}
                  onSave={handleSave}
                  onCancel={() => { setCreating(false); setEditing(null); }}
                />
              )}

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
    <div className={`group relative flex rounded-xl border border-[#e8e6dc] ${bgColor} transition hover:border-[#b0aea5]`}>
      {/* Left color bar */}
      <div className="w-[3px] shrink-0 rounded-l-xl" style={{ backgroundColor: colColor }} />
      <div className="flex-1 p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-[#141413]">{task.name}</h4>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] opacity-0 transition group-hover:opacity-100 hover:text-[#141413]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 w-[140px] rounded-lg border border-[#e8e6dc] bg-white py-1 shadow-lg">
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

// ── InlineTaskEditor ─────────────────────────────────────────

function InlineTaskEditor({ task, onSave, onCancel }: {
  task: TaskFile | null;
  onSave: (input: SaveTaskInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [trigger, setTrigger] = useState<TaskTrigger>(task?.trigger || "manual");
  const [schedule, setSchedule] = useState(task?.schedule || "");
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
      console.error(e);
    }
    setSaving(false);
  }

  return (
    <div className="mb-2 rounded-xl border-2 border-dashed border-[#b0aea5] bg-white p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isEdit}
        placeholder="task_name"
        autoFocus
        className="w-full text-[13px] font-semibold text-[#141413] outline-none placeholder:text-[#b0aea5] disabled:opacity-60"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="mt-1 w-full text-[11px] text-[#6b6963] outline-none placeholder:text-[#b0aea5]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Prompt body..."
        className="mt-2 w-full resize-none rounded-md border border-[#e8e6dc] bg-[#faf9f5] px-2 py-1.5 font-mono text-[11px] leading-relaxed text-[#141413] outline-none focus:border-[#b0aea5] placeholder:text-[#b0aea5]"
      />
      <div className="mt-2 flex items-center gap-1.5">
        {(["manual", "fixed", "model"] as const).map((t) => (
          <button key={t} onClick={() => setTrigger(t)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${trigger === t ? "bg-[#141413] text-white" : "bg-[#faf9f5] text-[#6b6963] hover:bg-[#e8e6dc]"}`}>
            {TRIGGER_LABEL[t]}
          </button>
        ))}
        {trigger === "fixed" && (
          <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 9 * * MON"
            className="ml-1 w-[100px] rounded-md border border-[#e8e6dc] bg-[#faf9f5] px-1.5 py-0.5 font-mono text-[10px] text-[#141413] outline-none" />
        )}
      </div>
      <div className="mt-2 flex justify-end gap-1.5">
        <button onClick={onCancel} className="rounded-md px-2.5 py-1 text-[11px] text-[#6b6963] hover:bg-[#faf9f5]">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim() || !body.trim()}
          className="rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#2a2a28] disabled:opacity-50">
          {saving ? "Saving\u2026" : isEdit ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
