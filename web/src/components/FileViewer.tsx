import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type FileTab } from "../store";
import { rawFileUrl, saveFile, deleteFile, fetchFiles } from "../api";

// ═══════════════════════════════════════════════════════════════
//  FileViewer (with toolbar: save, delete, mode toggle)
// ═══════════════════════════════════════════════════════════════

export default function FileViewer({ tab }: { tab: FileTab }) {
  const { serverUrl, setFileContent, closeFile, setFiles } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tab.content || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mdMode, setMdMode] = useState<"preview" | "source">("preview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync draft when tab content changes (e.g. initial load)
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
  const isEditable = !isImage;

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

  async function handleDelete() {
    try {
      await deleteFile(serverUrl, tab.path);
      closeFile(tab.path);
      const files = await fetchFiles(serverUrl);
      setFiles(files);
    } catch (e) {
      console.error("Delete failed:", e);
    }
    setConfirmDelete(false);
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    setDirty(true);
  }

  // Ctrl/Cmd+S to save
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (dirty) handleSave();
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" onKeyDown={handleKeyDown}>
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#e8e6dc] bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] text-[#6b6963] truncate">{tab.path}</span>
          {dirty && <span className="text-[10px] text-[#d97757] shrink-0">modified</span>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* MD mode toggle */}
          {isMd && (
            <div className="flex rounded-md border border-[#e8e6dc] overflow-hidden mr-1">
              <button
                onClick={() => setMdMode("preview")}
                className={`px-2 py-0.5 text-[11px] transition ${
                  mdMode === "preview"
                    ? "bg-[#141413] text-white"
                    : "text-[#b0aea5] hover:text-[#141413]"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setMdMode("source")}
                className={`px-2 py-0.5 text-[11px] transition ${
                  mdMode === "source"
                    ? "bg-[#141413] text-white"
                    : "text-[#b0aea5] hover:text-[#141413]"
                }`}
              >
                Source
              </button>
            </div>
          )}

          {/* Edit toggle (non-md text files) */}
          {isEditable && !isMd && (
            <button
              onClick={() => setEditing(!editing)}
              className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] transition ${
                editing
                  ? "bg-[#141413]/[0.06] text-[#141413]"
                  : "text-[#b0aea5] hover:text-[#141413]"
              }`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              Edit
            </button>
          )}

          {/* Save */}
          {isEditable && dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-6 items-center gap-1 rounded bg-[#141413] px-2 text-[11px] font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50"
            >
              {saving ? "..." : saved ? "Saved" : "Save"}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] hover:bg-[#d97757]/[0.06]"
            title="Delete file"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      {isImage ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#f5f4f0]">
          <img
            src={rawFileUrl(serverUrl, tab.path)}
            alt={tab.name}
            className="max-w-full max-h-full object-contain rounded"
          />
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
      ) : editing ? (
        <EditableArea value={draft} onChange={handleDraftChange} />
      ) : (
        <CodeView content={draft} />
      )}

      {/* ── Delete confirm ───────────────────────────────── */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413] mb-1.5">
              Delete file
            </h3>
            <p className="text-[13px] text-[#6b6963] mb-5">
              Delete <span className="font-mono text-[#141413]">{tab.name}</span> permanently?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5]">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="rounded-lg bg-[#d97757] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#c4684a]">
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Code view (read-only, with line numbers)
// ═══════════════════════════════════════════════════════════════

function CodeView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex-1 overflow-auto font-mono text-[13px] leading-5">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-[#f0efe9]">
              <td className="select-none text-right pr-4 pl-4 text-[#d5d3ca] w-[1%] whitespace-nowrap">
                {i + 1}
              </td>
              <td className="pr-4 whitespace-pre text-[#141413]">
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Editable textarea (for source editing)
// ═══════════════════════════════════════════════════════════════

function EditableArea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus when entering edit mode
    ref.current?.focus();
  }, []);

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

// ═══════════════════════════════════════════════════════════════
//  CSV table view
// ═══════════════════════════════════════════════════════════════

function CsvView({ content }: { content: string }) {
  const rows = content
    .split("\n")
    .filter(Boolean)
    .map((r) => r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));

  if (!rows.length)
    return <div className="p-6 text-[#b0aea5]">Empty file</div>;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {rows[0].map((cell, i) => (
              <th key={i} className="border-b border-[#e8e6dc] px-3 py-2 text-left font-medium bg-[#f5f4f0] sticky top-0">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className="hover:bg-[#faf9f5]">
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-[#e8e6dc] px-3 py-1.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}
