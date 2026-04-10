import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type FileTab } from "../store";
import { rawFileUrl, saveFile } from "../api";

// ═══════════════════════════════════════════════════════════════
//  FileViewer — auto-edit, save on diff, unsaved close warning
// ═══════════════════════════════════════════════════════════════

export default function FileViewer({
  tab,
  controlsSlot,
}: {
  tab: FileTab;
  controlsSlot: HTMLElement | null;
}) {
  const { serverUrl, setFileContent } = useStore();
  const [draft, setDraft] = useState(tab.content || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mdMode, setMdMode] = useState<"preview" | "source">("preview");

  useEffect(() => {
    setDraft(tab.content || "");
    setDirty(false);
  }, [tab.path, tab.content]);

  if (tab.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#b0aea5] text-sm">
        Loading...
      </div>
    );
  }

  const isImage = tab.type === "image";
  const isMd = tab.type === "markdown";

  async function handleSave() {
    setSaving(true);
    try {
      await saveFile(serverUrl, tab.path, draft);
      setFileContent(tab.path, draft);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    setDirty(value !== (tab.content || ""));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (dirty) handleSave();
    }
  }

  const controls = (
    <>
      {isMd && (
        <div className="flex rounded-full bg-[#e8e6dc]/70 p-[3px]">
          <button
            onClick={() => setMdMode("preview")}
            className={`px-3 py-[3px] text-[11px] font-medium rounded-full transition ${
              mdMode === "preview"
                ? "bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]"
                : "text-[#6b6963] hover:text-[#141413]"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setMdMode("source")}
            className={`px-3 py-[3px] text-[11px] font-medium rounded-full transition ${
              mdMode === "source"
                ? "bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]"
                : "text-[#6b6963] hover:text-[#141413]"
            }`}
          >
            Source
          </button>
        </div>
      )}
      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-6 items-center gap-1 rounded-full bg-[#d97757] px-3 text-[11px] font-medium text-white transition hover:bg-[#c56647] disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      )}
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0" onKeyDown={handleKeyDown}>
      {controlsSlot && createPortal(controls, controlsSlot)}

      {/* Content */}
      {isImage ? (
        <div className="flex-1 flex items-center justify-center p-10 bg-white">
          <img src={rawFileUrl(serverUrl, tab.path)} alt={tab.name}
            className="max-w-full max-h-full object-contain rounded" />
        </div>
      ) : isMd ? (
        mdMode === "preview" ? (
          <div className="flex-1 overflow-auto bg-white">
            <div className="max-w-3xl mx-auto px-8 py-6 prose text-[14px] leading-7 text-[#141413]">
              <Markdown remarkPlugins={[remarkGfm]}>{draft}</Markdown>
            </div>
          </div>
        ) : (
          <EditableArea value={draft} onChange={handleDraftChange} />
        )
      ) : (
        <EditableArea value={draft} onChange={handleDraftChange} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Editable textarea
// ═══════════════════════════════════════════════════════════════

function EditableArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="flex-1 overflow-auto bg-white">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full h-full min-h-full resize-none border-0 bg-transparent px-6 py-5 font-mono text-[13px] leading-6 text-[#141413] outline-none"
      />
    </div>
  );
}

function formatJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}
