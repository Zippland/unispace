import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import { SHOW_ALL_FILES_KEY } from "../api";

// ═══════════════════════════════════════════════════════════════
//  FilesPanel — self-contained file browser. Used by Sidebar (narrow)
//  and CustomizeContent (wide). Owns: search, view-mode, super-admin
//  toggle, drag-drop upload, single-row delete confirm.
// ═══════════════════════════════════════════════════════════════

// ── Hoisted entries (surfaced under their own tabs/menus elsewhere) ──
const HOISTED_NAMES = new Set([
  "CLAUDE.md",
  "sessions",
  "skills",
  "agents",
  "commands",
]);

// ── View mode ──────────────────────────────────────────────────
type FileViewMode = "folder" | "timeline";
const FILE_VIEW_MODE_KEY = "us:file_view_mode";

// ── Helpers ────────────────────────────────────────────────────

/** Walk a nested FileEntry tree and return every leaf, sorted by mtime desc. */
function flattenFiles(nodes: FileEntry[]): FileEntry[] {
  const out: FileEntry[] = [];
  const walk = (list: FileEntry[]) => {
    for (const n of list) {
      if (n.type === "file") out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return out;
}

/** Keyword-filter a tree: keep matching files + their ancestors. */
function filterTree(nodes: FileEntry[], keyword: string): FileEntry[] {
  const k = keyword.trim().toLowerCase();
  if (!k) return nodes;
  const walk = (list: FileEntry[]): FileEntry[] => {
    const out: FileEntry[] = [];
    for (const n of list) {
      if (n.type === "file") {
        if (n.name.toLowerCase().includes(k)) out.push(n);
      } else {
        const kids = walk(n.children || []);
        if (kids.length > 0) out.push({ ...n, children: kids });
      }
    }
    return out;
  };
  return walk(nodes);
}

function filterFlat(files: FileEntry[], keyword: string): FileEntry[] {
  const k = keyword.trim().toLowerCase();
  if (!k) return files;
  return files.filter((f) => f.name.toLowerCase().includes(k));
}

function relTime(ms?: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "now";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}m`;
  const y = Math.floor(d / 365);
  return `${y}y`;
}

function groupByTime(
  files: FileEntry[],
): { label: string; items: FileEntry[] }[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayMs = start.getTime();
  const yesterdayMs = todayMs - 86_400_000;
  const weekMs = todayMs - 7 * 86_400_000;
  const monthMs = todayMs - 30 * 86_400_000;

  const buckets: { label: string; items: FileEntry[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "This month", items: [] },
    { label: "Older", items: [] },
  ];
  for (const f of files) {
    const t = f.updatedAt || 0;
    if (t >= todayMs) buckets[0].items.push(f);
    else if (t >= yesterdayMs) buckets[1].items.push(f);
    else if (t >= weekMs) buckets[2].items.push(f);
    else if (t >= monthMs) buckets[3].items.push(f);
    else buckets[4].items.push(f);
  }
  return buckets.filter((b) => b.items.length > 0);
}

// ── Inline icons ───────────────────────────────────────────────

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

function FileIconSm({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

// ── File row ──────────────────────────────────────────────────

function FileNode({
  file,
  depth,
  onOpenFile,
  timeLabel,
  defaultExpanded,
}: {
  file: FileEntry;
  depth: number;
  onOpenFile: (path: string, name: string) => void;
  timeLabel?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? depth < 1);
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
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: "file", path: file.path, name: file.name }),
          );
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
          <FileIconSm className="h-3.5 w-3.5 shrink-0 text-[#d5d3ca]" />
        )}
        <span
          className={`truncate flex-1 ${
            file.type === "directory"
              ? "text-[#141413] font-medium"
              : "text-[#6b6963]"
          }`}
        >
          {file.name}
        </span>
        {timeLabel && (
          <span className="shrink-0 text-[10px] tabular-nums text-[#b0aea5] group-hover:hidden">
            {timeLabel}
          </span>
        )}
        {file.type === "file" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="hidden group-hover:flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#d97757]"
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
          <FileNode
            key={c.path}
            file={c}
            depth={depth + 1}
            onOpenFile={onOpenFile}
            defaultExpanded={defaultExpanded}
          />
        ))}

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

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
        <h3 className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413] mb-1.5">{title}</h3>
        <p className="text-[13px] text-[#6b6963] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5]">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-[#d97757] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#c4684a]">
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

// ── FilesPanel ─────────────────────────────────────────────────
//
// Imperative handle: parent components (Sidebar, CustomizeContent)
// own their own header chrome and trigger the hidden file input via
// `panelRef.current?.openUpload()`. This keeps the + Upload button
// in the same row as the parent's tab nav / section header instead
// of stranding it in a one-button row inside FilesPanel.

export interface FilesPanelHandle {
  openUpload: () => void;
}

interface FilesPanelProps {
  onOpenFile: (path: string, name: string) => void;
}

const FilesPanel = forwardRef<FilesPanelHandle, FilesPanelProps>(function FilesPanel(
  { onOpenFile },
  ref,
) {
  const { files, serverUrl, setFiles } = useStore();

  // View mode (folder vs timeline) — persisted
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(() => {
    if (typeof window === "undefined") return "folder";
    const saved = window.localStorage.getItem(FILE_VIEW_MODE_KEY);
    return saved === "timeline" ? "timeline" : "folder";
  });
  useEffect(() => {
    window.localStorage.setItem(FILE_VIEW_MODE_KEY, fileViewMode);
  }, [fileViewMode]);

  // Search
  const [fileSearch, setFileSearch] = useState("");

  // Show all (super admin) — persisted, drives api.fetchFiles auto-flag
  const [showAllFiles, setShowAllFiles] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SHOW_ALL_FILES_KEY) === "1";
  });
  useEffect(() => {
    window.localStorage.setItem(SHOW_ALL_FILES_KEY, showAllFiles ? "1" : "0");
    api.fetchFiles(serverUrl).then(setFiles).catch(() => {});
  }, [showAllFiles, serverUrl, setFiles]);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(async () => {
    setFiles(await api.fetchFiles(serverUrl));
  }, [serverUrl, setFiles]);

  const handleUpload = useCallback(
    async (file: File) => {
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
    },
    [serverUrl, refreshFiles],
  );

  // Drag handlers — only react to external file drops
  const isExternalFileDrag = useCallback(
    (e: React.DragEvent): boolean => e.dataTransfer.types.includes("Files"),
    [],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isExternalFileDrag(e)) return;
      dragCounterRef.current += 1;
      if (dragCounterRef.current > 0) setIsDragging(true);
    },
    [isExternalFileDrag],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isExternalFileDrag(e)) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    },
    [isExternalFileDrag],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;
      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const file of droppedFiles) await handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;
      for (const file of Array.from(fileList)) handleUpload(file);
      e.target.value = "";
    },
    [handleUpload],
  );

  const userFiles = showAllFiles
    ? files
    : files.filter((f) => !HOISTED_NAMES.has(f.name));

  // Expose openUpload to parent so the + Upload button can live in
  // the parent's tab nav header instead of inside this panel.
  useImperativeHandle(
    ref,
    () => ({
      openUpload: () => fileInputRef.current?.click(),
    }),
    [],
  );

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[#d97757] bg-white/90 m-2">
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
        <div className="mx-3 mt-1 flex items-center gap-1.5 rounded-lg bg-[#d97757]/[0.06] px-3 py-2 text-[12px] text-[#d97757]">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {uploadError}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mx-3 mt-1 flex items-center gap-2 rounded-lg bg-[#faf9f5] px-3 py-2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#e8e6dc] border-t-[#d97757]" />
          <span className="text-[12px] text-[#6b6963]">Uploading...</span>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

      {/* Search row + view-mode + show-all toggles */}
      <div className="mb-2 mt-2 flex items-center gap-1.5 px-3 shrink-0">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#b0aea5]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-md border border-[#e8e6dc] bg-white py-1 pl-6 pr-6 text-[12px] text-[#141413] outline-none transition placeholder:text-[#b0aea5] focus:border-[#b0aea5]"
          />
          {fileSearch && (
            <button
              onClick={() => setFileSearch("")}
              className="absolute right-1.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413]"
              title="Clear"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() =>
            setFileViewMode(fileViewMode === "folder" ? "timeline" : "folder")
          }
          title={
            fileViewMode === "folder"
              ? "Switch to timeline view"
              : "Switch to folder view"
          }
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#e8e6dc] bg-white text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
        >
          {fileViewMode === "folder" ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setShowAllFiles((v) => !v)}
          title={
            showAllFiles
              ? "Exit super admin mode"
              : "Super admin — reveal every file on disk"
          }
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
            showAllFiles
              ? "border-[#d97757] bg-[#d97757] text-white hover:bg-[#c4613f]"
              : "border-[#e8e6dc] bg-white text-[#b0aea5] hover:bg-[#faf9f5] hover:text-[#141413]"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </button>
      </div>

      {/* File tree (or timeline grouped flat list) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {(() => {
          if (userFiles.length === 0) {
            return (
              <p className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
                Drop files here or click upload
              </p>
            );
          }
          const searching = fileSearch.trim().length > 0;

          if (fileViewMode === "folder") {
            const filtered = filterTree(userFiles, fileSearch);
            if (filtered.length === 0) {
              return (
                <p className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
                  No files match "{fileSearch.trim()}"
                </p>
              );
            }
            return filtered.map((f) => (
              <FileNode
                key={searching ? `s:${f.path}` : f.path}
                file={f}
                depth={0}
                onOpenFile={onOpenFile}
                defaultExpanded={searching ? true : undefined}
              />
            ));
          }

          // timeline mode
          const flat = filterFlat(flattenFiles(userFiles), fileSearch);
          if (flat.length === 0) {
            return (
              <p className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
                No files match "{fileSearch.trim()}"
              </p>
            );
          }
          return groupByTime(flat).map((g) => (
            <div key={g.label} className="mb-2">
              <div className="px-3 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wide text-[#b0aea5]">
                {g.label}
              </div>
              {g.items.map((f) => (
                <FileNode
                  key={f.path}
                  file={f}
                  depth={0}
                  onOpenFile={onOpenFile}
                  timeLabel={relTime(f.updatedAt)}
                />
              ))}
            </div>
          ));
        })()}
      </div>
    </div>
  );
});

FilesPanel.displayName = "FilesPanel";

export default FilesPanel;
