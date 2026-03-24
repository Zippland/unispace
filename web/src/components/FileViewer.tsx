import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type FileTab } from "../store";
import { rawFileUrl, saveFile } from "../api";

// ═══════════════════════════════════════════════════════════════
//  FileViewer — auto-edit, save on diff, unsaved close warning
// ═══════════════════════════════════════════════════════════════

export default function FileViewer({ tab }: { tab: FileTab }) {
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

  return (
    <div className="flex-1 flex flex-col min-h-0" onKeyDown={handleKeyDown}>
      {/* Toolbar — minimal: path + save button when dirty */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#e8e6dc] bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] text-[#6b6963] truncate">{tab.path}</span>
          {dirty && <span className="text-[10px] text-[#d97757] shrink-0">modified</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isMd && (
            <div className="flex rounded-md border border-[#e8e6dc] overflow-hidden mr-1">
              <button onClick={() => setMdMode("preview")}
                className={`px-2 py-0.5 text-[11px] transition ${mdMode === "preview" ? "bg-[#141413] text-white" : "text-[#b0aea5] hover:text-[#141413]"}`}>
                Preview
              </button>
              <button onClick={() => setMdMode("source")}
                className={`px-2 py-0.5 text-[11px] transition ${mdMode === "source" ? "bg-[#141413] text-white" : "text-[#b0aea5] hover:text-[#141413]"}`}>
                Source
              </button>
            </div>
          )}
          {dirty && (
            <button onClick={handleSave} disabled={saving}
              className="flex h-6 items-center gap-1 rounded bg-[#141413] px-2.5 text-[11px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50">
              {saving ? "..." : saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isImage ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#f5f4f0]">
          <img src={rawFileUrl(serverUrl, tab.path)} alt={tab.name}
            className="max-w-full max-h-full object-contain rounded" />
        </div>
      ) : isMd ? (
        mdMode === "preview" ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto prose text-sm text-[#141413]">
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
//  Editable textarea with line numbers
// ═══════════════════════════════════════════════════════════════

function EditableArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="flex-1 overflow-auto bg-[#faf9f5]">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full h-full min-h-full resize-none border-0 bg-transparent px-4 py-3 font-mono text-[13px] leading-5 text-[#141413] outline-none"
      />
    </div>
  );
}

function formatJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}
