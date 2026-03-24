import { useState } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";

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

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  onOpenFile: (path: string, name: string) => void;
}

export default function Sidebar({ onOpenFile }: SidebarProps) {
  const { workDir, files, serverUrl, setFiles } = useStore();

  async function refreshFiles() {
    setFiles(await api.fetchFiles(serverUrl));
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
        <div className="min-w-0 flex-1">
          <span className={`block truncate ${
            file.type === "directory" ? "text-[#141413] font-medium" : "text-[#6b6963]"
          }`}>
            {file.name}
          </span>
          {file.updatedAt && (
            <span className="block text-[10px] text-[#b0aea5] leading-tight">
              {new Date(file.updatedAt).toLocaleDateString(undefined, {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
      {expanded && file.children?.map((c) => (
        <FileNode key={c.path} file={c} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}
