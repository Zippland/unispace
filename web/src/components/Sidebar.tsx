import { useState, useRef, useCallback } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import SettingsDialog from "./SettingsDialog";

// ── SVG Icons ─────────────────────────────────────────────────

function FolderIcon({ open, className }: { open?: boolean; className?: string }) {
  return open ? (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
    </svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

// ── Resize handle (horizontal) ────────────────────────────────

function HResizeHandle({ onResize }: { onResize: (dy: number) => void }) {
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    let lastY = e.clientY;
    function onMove(ev: MouseEvent) {
      onResize(ev.clientY - lastY);
      lastY = ev.clientY;
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  return (
    <div className="h-[5px] shrink-0 cursor-row-resize relative group" onMouseDown={handleMouseDown}>
      <div className="absolute inset-x-0 top-[2px] h-px bg-[#e8e6dc] group-hover:bg-[#b0aea5] group-hover:h-[2px] group-hover:top-[1.5px] transition-all" />
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
        <h3 className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413] mb-1.5">{title}</h3>
        <p className="text-[13px] text-[#6b6963] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel}
            className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5]">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="rounded-lg bg-[#d97757] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#c4684a]">
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  onOpenFile: (path: string, name: string) => void;
}

export default function Sidebar({ onOpenFile }: SidebarProps) {
  const {
    workDir, files, sessions, activeSessionId, serverUrl, messages,
    setActiveSession, setActiveTab, setSessionMessages, removeSession, setFiles,
  } = useStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sessionH, setSessionH] = useState(() => {
    const s = localStorage.getItem("us:sessionH");
    return s ? parseInt(s) : 200;
  });

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  async function refreshFiles() {
    setFiles(await api.fetchFiles(serverUrl));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await api.deleteSession(serverUrl, deleteTarget);
    removeSession(deleteTarget);
    setDeleteTarget(null);
  }

  function handleNewSession() {
    setActiveSession(null);
    setActiveTab(null);
  }

  async function handleSwitchSession(id: string) {
    setActiveSession(id);
    setActiveTab(null);
    if (!messages[id] || messages[id].length === 0) {
      try {
        const raw = await api.fetchSessionMessages(serverUrl, id);
        if (raw.length > 0) {
          setSessionMessages(id, api.convertRawMessages(raw));
        }
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-[#e8e6dc]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141413] shrink-0">
              <svg className="h-4 w-4 text-[#faf9f5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413] leading-tight">
                UniSpace
              </h1>
              <p className="text-[10px] text-[#b0aea5] font-mono truncate leading-tight mt-0.5">
                {workDir}
              </p>
            </div>
          </div>
          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]"
            title="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Workspace (files) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-1.5">
          <span className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold text-[#b0aea5] uppercase tracking-widest">
            Workspace
          </span>
          <button onClick={refreshFiles}
            className="flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]"
            title="Refresh">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
        <div className="px-2 pb-2">
          {files.length === 0 ? (
            <p className="text-[12px] text-[#b0aea5] px-3 py-6 text-center">
              No files in workspace
            </p>
          ) : (
            files.map((f) => (
              <FileNode key={f.path} file={f} depth={0} onOpenFile={onOpenFile} />
            ))
          )}
        </div>
      </div>

      {/* ── Resize handle ──────────────────────────────────── */}
      <HResizeHandle onResize={(dy) => {
        const next = clamp(sessionH - dy, 100, 500);
        setSessionH(next);
        localStorage.setItem("us:sessionH", String(next));
      }} />

      {/* ── Sessions ───────────────────────────────────────── */}
      <div className="flex flex-col shrink-0" style={{ height: sessionH }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <span className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold text-[#b0aea5] uppercase tracking-widest">
            Sessions
          </span>
          <button onClick={handleNewSession}
            className="flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] hover:bg-[#d97757]/[0.06]"
            title="New session">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="text-[12px] text-[#b0aea5] px-3 py-6 text-center">
              No sessions yet
            </p>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const msgCount = messages[s.id]?.length || s.messageCount || 0;
              return (
                <div key={s.id}
                  onClick={() => handleSwitchSession(s.id)}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition ${
                    isActive ? "bg-[#141413]/[0.04]" : "hover:bg-[#141413]/[0.02]"
                  }`}>
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "bg-[#788c5d]" : "bg-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[13px] ${isActive ? "font-medium text-[#141413]" : "text-[#6b6963]"}`}>
                      {s.title || "Session"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#b0aea5]">
                        {new Date(s.createdAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {msgCount > 0 && (
                        <span className="text-[10px] text-[#b0aea5]/60">
                          {msgCount} msg{msgCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(s.id); }}
                    className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] hover:bg-[#d97757]/[0.06]">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Dialogs ────────────────────────────────────────── */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session"
        message="This session and its history will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── File tree node ────────────────────────────────────────────

function FileNode({
  file, depth, onOpenFile,
}: {
  file: FileEntry; depth: number;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-[3px] px-2 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() =>
          file.type === "directory"
            ? setExpanded(!expanded)
            : onOpenFile(file.path, file.name)
        }>
        {file.type === "directory" ? (
          <FolderIcon open={expanded} className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" />
        ) : (
          <FileIcon className="h-3.5 w-3.5 shrink-0 text-[#d5d3ca]" />
        )}
        <span className={`truncate ${
          file.type === "directory" ? "text-[#141413] font-medium" : "text-[#6b6963]"
        }`}>
          {file.name}
        </span>
      </div>
      {expanded && file.children?.map((c) => (
        <FileNode key={c.path} file={c} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}
