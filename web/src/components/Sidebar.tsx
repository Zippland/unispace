import { useState, useRef, useCallback } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";

// ── Icons ─────────────────────────────────────────────────────

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

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

function ChannelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6V7.5Z" />
    </svg>
  );
}

// ── System file names ─────────────────────────────────────────

const SYSTEM_NAMES = new Set(["config.json", "SOUL.md", "channels.json", "sessions", "skills"]);

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  onOpenFile: (path: string, name: string) => void;
}

export default function Sidebar({ onOpenFile }: SidebarProps) {
  const { workDir, files, serverUrl, setFiles, setActiveSession, setActiveTab, removeSession } = useStore();

  // ── Upload state ────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshFiles() {
    setFiles(await api.fetchFiles(serverUrl));
  }

  // ── Upload logic ────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`);
      setTimeout(() => setUploadError(""), 3000);
      return;
    }
    setUploading(true);
    try {
      await api.uploadFile(serverUrl, file);
      await refreshFiles();
    } catch {
      setUploadError("Upload failed");
      setTimeout(() => setUploadError(""), 3000);
    }
    setUploading(false);
  }, [serverUrl]);

  // ── Drag handlers (copied from finance_agent) ───────────
  const isExternalFileDrag = useCallback((e: React.DragEvent): boolean => {
    return e.dataTransfer.types.includes("Files");
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExternalFileDrag(e)) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current > 0) setIsDragging(true);
  }, [isExternalFileDrag]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExternalFileDrag(e)) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  }, [isExternalFileDrag]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await handleUpload(file);
    }
  }, [handleUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      handleUpload(file);
    }
    e.target.value = "";
  }, [handleUpload]);

  // ── Session actions ─────────────────────────────────────
  function handleNewSession() {
    setActiveSession(null);
    setActiveTab(null);
  }

  async function handleDeleteSession(sessionPath: string) {
    const id = sessionPath.replace("sessions/", "").replace(".jsonl", "");
    await api.deleteSession(serverUrl, id);
    removeSession(id);
    refreshFiles();
  }

  const systemFiles = files.filter((f) => SYSTEM_NAMES.has(f.name));
  const userFiles = files.filter((f) => !SYSTEM_NAMES.has(f.name));

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-[#e8e6dc]">
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
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 border-2 border-dashed border-[#d97757] rounded-lg m-2">
            <div className="flex flex-col items-center gap-1.5">
              <svg className="h-6 w-6 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-[13px] text-[#d97757] font-medium">Drop to upload</span>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-lg bg-[#d97757]/[0.06] px-3 py-2 text-[12px] text-[#d97757]">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {uploadError}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg bg-[#faf9f5] px-3 py-2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#e8e6dc] border-t-[#d97757]" />
            <span className="text-[12px] text-[#6b6963]">Uploading...</span>
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

        {/* ── System section ────────────────────────────────── */}
        <div className="px-4 pt-4 pb-1.5">
          <span className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold text-[#b0aea5] uppercase tracking-widest">
            System
          </span>
        </div>
        <div className="px-2 pb-1">
          {systemFiles.map((f) =>
            f.name === "sessions" && f.type === "directory" ? (
              <SessionsFolder
                key={f.path}
                folder={f}
                onOpenFile={onOpenFile}
                onNew={handleNewSession}
                onDelete={handleDeleteSession}
              />
            ) : f.name === "skills" && f.type === "directory" ? (
              <SkillsFolder key={f.path} folder={f} onOpenFile={onOpenFile} />
            ) : (
              <SystemFileItem key={f.path} file={f} onClick={() => onOpenFile(f.path, f.name)} />
            ),
          )}
        </div>

        {/* ── Files section (always visible for drag-drop target) ── */}
        <>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span className="font-['Poppins',_Arial,_sans-serif] text-[11px] font-semibold text-[#b0aea5] uppercase tracking-widest">
                Files
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757] hover:bg-[#d97757]/[0.06]"
                  title="Upload file"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                </button>
                <button
                  onClick={refreshFiles}
                  className="flex h-5 w-5 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]"
                  title="Refresh"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-2 pb-2">
              {userFiles.length === 0 ? (
                <p className="text-[11px] text-[#b0aea5] px-3 py-3 text-center">
                  Drop files here or click upload
                </p>
              ) : (
                userFiles.map((f) => (
                  <FileNode key={f.path} file={f} depth={0} onOpenFile={onOpenFile} />
                ))
              )}
            </div>
          </>
      </div>
    </div>
  );
}

// ── System file item (config.json, SOUL.md) ───────────────────

function SystemFileItem({ file, onClick }: { file: FileEntry; onClick: () => void }) {
  const icon =
    file.name === "config.json" ? (
      <GearIcon className="h-3.5 w-3.5 shrink-0 text-[#d97757]" />
    ) : file.name === "SOUL.md" ? (
      <DocIcon className="h-3.5 w-3.5 shrink-0 text-[#6a9bcc]" />
    ) : file.name === "channels.json" ? (
      <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-[#7c9a5e]" />
    ) : (
      <FileIcon className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" />
    );

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ type: "file", path: file.path || file.name, name: file.name }));
        e.dataTransfer.setData("x-unispace-drag", "file");
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex items-center gap-1.5 py-[5px] px-3 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
    >
      {icon}
      <span className="text-[#6b6963]">{file.name}</span>
    </div>
  );
}

// ── Sessions folder (with +new and x delete) ──────────────────

function SessionsFolder({
  folder,
  onOpenFile,
  onNew,
  onDelete,
}: {
  folder: FileEntry;
  onOpenFile: (path: string, name: string) => void;
  onNew: () => void;
  onDelete: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);

  return (
    <div>
      {/* Folder header */}
      <div className="flex items-center gap-1.5 py-[5px] px-3 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition">
        <div className="flex-1 flex items-center gap-1.5 min-w-0" onClick={() => setExpanded(!expanded)}>
          <ChatIcon className="h-3.5 w-3.5 shrink-0 text-[#788c5d]" />
          <span className="text-[#141413] font-medium">sessions</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNew(); }}
          className="flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757]"
          title="New session"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Session entries — sorted by updatedAt desc, max-height ~5 items with own scroll */}
      {expanded && (() => {
        const sorted = [...(folder.children || [])].sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
        );
        return (
          <div className="max-h-[200px] overflow-y-auto">
            {sorted.map((s) => (
              <div
                key={s.path}
                onClick={() => onOpenFile(s.path, s.name)}
                className="group flex items-center gap-1.5 py-[4px] pr-2 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
                style={{ paddingLeft: 28 }}
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[#6b6963]">{s.name}</span>
                  {s.updatedAt && (
                    <span className="block text-[10px] text-[#b0aea5] leading-tight">
                      {new Date(s.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ path: s.path, name: s.name }); }}
                  className="opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757]"
                  title="Delete session"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete session"
          message={`Delete "${deleteTarget.name}" and its history permanently?`}
          onConfirm={() => { onDelete(deleteTarget.path); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Skills folder (recursive tree with bolt icons) ────────────

function SkillsFolder({
  folder,
  onOpenFile,
}: {
  folder: FileEntry;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-[5px] px-3 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
        onClick={() => setExpanded(!expanded)}
      >
        <svg className="h-3.5 w-3.5 shrink-0 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
        <span className="text-[#141413] font-medium">skills</span>
        {folder.children && (
          <span className="text-[10px] text-[#b0aea5]">{folder.children.length}</span>
        )}
      </div>
      {expanded &&
        folder.children?.map((child) => (
          <SkillNode key={child.path} file={child} depth={1} isTopLevel={true} onOpenFile={onOpenFile} />
        ))}
    </div>
  );
}

function SkillNode({
  file,
  depth,
  isTopLevel,
  onOpenFile,
}: {
  file: FileEntry;
  depth: number;
  isTopLevel: boolean;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDir = file.type === "directory";

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-[3px] px-2 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
        style={{ paddingLeft: depth * 14 + 14 }}
        draggable={!isDir || isTopLevel}
        onDragStart={(e) => {
          if (isTopLevel && isDir) {
            // Drag skill folder as a skill reference
            e.dataTransfer.setData("application/json", JSON.stringify({ type: "skill", path: file.path, name: file.name }));
            e.dataTransfer.setData("x-unispace-drag", "skill");
            e.dataTransfer.effectAllowed = "copy";
          } else if (!isDir) {
            e.dataTransfer.setData("application/json", JSON.stringify({ type: "file", path: file.path, name: file.name }));
            e.dataTransfer.setData("x-unispace-drag", "file");
            e.dataTransfer.effectAllowed = "copy";
          }
        }}
        onClick={() => isDir ? setExpanded(!expanded) : onOpenFile(file.path, file.name)}
      >
        {isDir ? (
          isTopLevel ? (
            <svg className="h-3.5 w-3.5 shrink-0 text-[#d97757]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          ) : (
            <FolderIcon open={expanded} className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" />
          )
        ) : (
          <FileIcon className="h-3 w-3 shrink-0 text-[#d5d3ca]" />
        )}
        <span className={`truncate ${isDir ? "text-[#141413] font-medium" : "text-[#6b6963]"}`}>
          {file.name}
        </span>
      </div>
      {expanded && isDir &&
        file.children?.map((c) => (
          <SkillNode key={c.path} file={c} depth={depth + 1} isTopLevel={false} onOpenFile={onOpenFile} />
        ))}
    </div>
  );
}

// ── File tree node (for user files) ───────────────────────────

function FileNode({
  file,
  depth,
  onOpenFile,
}: {
  file: FileEntry;
  depth: number;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { serverUrl, setFiles, closeFile } = useStore();

  async function handleDelete() {
    try {
      await api.deleteFile(serverUrl, file.path);
      closeFile(file.path);
      const files = await api.fetchFiles(serverUrl);
      setFiles(files);
    } catch {}
    setConfirmDelete(false);
  }

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-[3px] px-2 rounded-md hover:bg-[#141413]/[0.03] cursor-pointer text-[13px] transition"
        style={{ paddingLeft: depth * 16 + 8 }}
        draggable={file.type === "file"}
        onDragStart={(e) => {
          if (file.type !== "file") return;
          e.dataTransfer.setData("application/json", JSON.stringify({ type: "file", path: file.path, name: file.name }));
          e.dataTransfer.setData("x-unispace-drag", "file");
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() =>
          file.type === "directory"
            ? setExpanded(!expanded)
            : onOpenFile(file.path, file.name)
        }
      >
        {file.type === "directory" ? (
          <FolderIcon open={expanded} className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" />
        ) : (
          <FileIcon className="h-3.5 w-3.5 shrink-0 text-[#d5d3ca]" />
        )}
        <span className={`truncate flex-1 ${file.type === "directory" ? "text-[#141413] font-medium" : "text-[#6b6963]"}`}>
          {file.name}
        </span>
        {file.type === "file" && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757]"
            title="Delete"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {expanded &&
        file.children?.map((c) => (
          <FileNode key={c.path} file={c} depth={depth + 1} onOpenFile={onOpenFile} />
        ))}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete file"
          message={`Delete ${file.name} permanently?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

// ── Confirm dialog (shared) ───────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
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
