import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore, type FileTab } from "../store";
import { saveTask, type TaskTrigger, type SaveTaskInput } from "../api";

const TRIGGER_LABEL: Record<TaskTrigger, string> = {
  manual: "Manual",
  fixed: "Fixed",
  model: "Model",
};

export default function TaskArtifactEditor({
  tab,
  controlsSlot,
}: {
  tab: FileTab;
  controlsSlot: HTMLElement | null;
}) {
  const { serverUrl, closeFile, setFileContent } = useStore();

  const initial = tab.content ? JSON.parse(tab.content) : {};
  const isNew = tab.path === "__task__/__new__";

  const [name, setName] = useState(initial.name || "");
  const [description, setDescription] = useState(initial.description || "");
  const [trigger, setTrigger] = useState<TaskTrigger>(initial.trigger || "manual");
  const [schedule, setSchedule] = useState(initial.schedule || "");
  const [body, setBody] = useState(initial.body || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = tab.content ? JSON.parse(tab.content) : {};
    setName(data.name || "");
    setDescription(data.description || "");
    setTrigger(data.trigger || "manual");
    setSchedule(data.schedule || "");
    setBody(data.body || "");
  }, [tab.path]);

  async function handleSave() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const input: SaveTaskInput = {
        name: name.trim(),
        description: description.trim(),
        trigger,
        schedule: trigger === "fixed" ? schedule.trim() : undefined,
        body,
      };
      await saveTask(serverUrl, input);
      setFileContent(tab.path, JSON.stringify(input));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      if (isNew) closeFile(tab.path);
    } catch (e) {
      console.error("Save task failed:", e);
    }
    setSaving(false);
  }

  return (
    <>
      {controlsSlot &&
        createPortal(
          <div className="flex items-center gap-1.5">
            {saved && <span className="text-[11px] text-[#788c5d]">Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !body.trim()}
              className="rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#2a2a28] disabled:opacity-40"
            >
              {saving ? "Saving\u2026" : isNew ? "Create" : "Save"}
            </button>
          </div>,
          controlsSlot,
        )}

      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-lg space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">Name (slug)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isNew}
              placeholder="weekly_report"
              autoFocus={isNew}
              className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none transition focus:border-[#141413] disabled:opacity-60"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this task do?"
              className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none transition focus:border-[#141413]"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[#6b6963]">Trigger</label>
            <div className="flex items-center gap-2">
              {(["manual", "fixed", "model"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrigger(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    trigger === t
                      ? "bg-[#141413] text-white"
                      : "bg-[#faf9f5] text-[#6b6963] hover:bg-[#e8e6dc]"
                  }`}
                >
                  {TRIGGER_LABEL[t]}
                </button>
              ))}
            </div>
            {trigger === "fixed" && (
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 9 * * MON"
                className="mt-2 w-48 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-xs text-[#141413] outline-none transition focus:border-[#141413]"
              />
            )}
          </div>

          {/* Body (prompt) */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b6963]">
              Prompt body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write the prompt that the agent will execute..."
              className="w-full resize-none rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 font-mono text-sm leading-relaxed text-[#141413] outline-none transition focus:border-[#141413]"
            />
          </div>
        </div>
      </div>
    </>
  );
}
