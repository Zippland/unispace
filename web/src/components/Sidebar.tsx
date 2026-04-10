import { useState, useRef, useCallback, useEffect } from "react";
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

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-medium leading-tight bg-[#7c9a5e]/10 text-[#7c9a5e]">
      {channel}
    </span>
  );
}

// ── Hoisted / reserved top-level entries (surfaced under their own tabs) ──

const HOISTED_NAMES = new Set([
  "CLAUDE.md",
  "sessions",
  "skills",
  "commands",
]);

// ── Workspace resource tabs ───────────────────────────────────

type TabKey = "skills" | "prompt" | "files" | "connectors";

const TABS: { key: TabKey; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "prompt", label: "Prompt" },
  { key: "files", label: "Files" },
  { key: "connectors", label: "Connectors" },
];

// ── Paths (mirror server hoisting) ────────────────────────────

const COMMANDS_DIR = ".claude/commands";
const SKILLS_DIR = ".claude/skills";

// ── Recents panel height ──────────────────────────────────────

const RECENTS_MIN_HEIGHT = 80;
const RECENTS_MAX_HEIGHT = 500;
const RECENTS_HEIGHT_KEY = "us:recents_height";

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  onOpenFile: (path: string, name: string) => void;
  onOpenSettings: () => void;
  onOpenDispatch: () => void;
}

export default function Sidebar({
  onOpenFile,
  onOpenSettings,
  onOpenDispatch,
}: SidebarProps) {
  const {
    projects,
    currentProject,
    files,
    serverUrl,
    setFiles,
    setActiveSession,
    setActiveTab,
    removeSession,
    setSessions,
  } = useStore();

  // Project switcher state
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [cloneDialog, setCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneError, setCloneError] = useState("");

  // Active workspace tab
  const [activeTabKey, setActiveTabKey] = useState<TabKey>("files");

  // Dialog state for create-command / create-skill
  const [commandDialog, setCommandDialog] = useState(false);
  const [skillDialog, setSkillDialog] = useState(false);

  function slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleCreateCommand(name: string, text: string) {
    const slug = slugify(name);
    if (!slug) throw new Error("Invalid name");
    const path = `${COMMANDS_DIR}/${slug}.md`;
    await api.saveFile(serverUrl, path, text);
    await refreshFiles();
    setCommandDialog(false);
  }

  async function handleCreateSkill(name: string) {
    const slug = slugify(name);
    if (!slug) throw new Error("Invalid name");
    const path = `${SKILLS_DIR}/${slug}/SKILL.md`;
    const stub = `---\nname: ${slug}\ndescription: describe what this skill does\n---\n\n# ${name.trim()}\n\nDescribe how to use this skill.\n`;
    await api.saveFile(serverUrl, path, stub);
    await refreshFiles();
    setSkillDialog(false);
  }

  // Recents panel height (resizable, persisted)
  const [recentsHeight, setRecentsHeight] = useState<number>(() => {
    const saved = localStorage.getItem(RECENTS_HEIGHT_KEY);
    return saved ? parseInt(saved) : 200;
  });
  const [isResizingRecents, setIsResizingRecents] = useState(false);

  const startResizingRecents = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRecents(true);
      const startY = e.clientY;
      const startHeight = recentsHeight;

      const onMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        const next = Math.max(
          RECENTS_MIN_HEIGHT,
          Math.min(RECENTS_MAX_HEIGHT, startHeight + delta),
        );
        setRecentsHeight(next);
        localStorage.setItem(RECENTS_HEIGHT_KEY, String(next));
      };
      const onUp = () => {
        setIsResizingRecents(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [recentsHeight],
  );

  async function handleSwitchProject(name: string) {
    if (name === currentProject) {
      setProjectMenuOpen(false);
      return;
    }
    try {
      await api.switchProject(serverUrl, name);
      // Refresh everything — new project has its own files/sessions
      const [projectsResp, sessions, files] = await Promise.all([
        api.fetchProjects(serverUrl),
        api.fetchSessions(serverUrl),
        api.fetchFiles(serverUrl),
      ]);
      useStore.getState().setProjects(projectsResp.projects, projectsResp.current);
      setSessions(sessions);
      setFiles(files);
      setActiveSession(null);
      setActiveTab(null);
    } catch {}
    setProjectMenuOpen(false);
  }

  async function handleCloneConfirm() {
    if (!cloneName.trim()) {
      setCloneError("Name required");
      return;
    }
    try {
      await api.cloneProject(serverUrl, currentProject, cloneName.trim());
      const projectsResp = await api.fetchProjects(serverUrl);
      useStore.getState().setProjects(projectsResp.projects, projectsResp.current);
      setCloneDialog(false);
      setCloneName("");
      setCloneError("");
    } catch (e: any) {
      setCloneError(e.message || "Clone failed");
    }
  }

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
    const id = sessionPath.replace("sessions/", "").replace(".json", "");
    await api.deleteSession(serverUrl, id);
    removeSession(id);
    refreshFiles();
  }

  const userFiles = files.filter((f) => !HOISTED_NAMES.has(f.name));
  const sessionsFolder = files.find(
    (f) => f.name === "sessions" && f.type === "directory",
  );
  const sessions = sessionsFolder?.children || [];

  const skillsFolder = files.find(
    (f) => f.name === "skills" && f.type === "directory",
  );
  const skillsList = (skillsFolder?.children || []).filter(
    (s) => s.type === "directory",
  );

  const commandsFolder = files.find(
    (f) => f.name === "commands" && f.type === "directory",
  );
  const commandsList = (commandsFolder?.children || []).filter(
    (c) => c.type === "file" && c.name.toLowerCase().endsWith(".md"),
  );

  const globalPromptFile = files.find((f) => f.name === "CLAUDE.md");

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
          <div className="min-w-0 flex-1">
            <h1 className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413] leading-tight">
              UniSpace
            </h1>
            <p className="text-[10px] text-[#b0aea5] leading-tight mt-0.5">
              Your own agent, per project
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] transition hover:text-[#141413] hover:bg-[#141413]/[0.04]"
            title="Settings"
          >
            <GearIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Project switcher ──────────────────────────── */}
        <div className="relative mt-3">
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex w-full items-center gap-2 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-left text-[13px] text-[#141413] transition hover:border-[#b0aea5]"
          >
            <svg className="h-3.5 w-3.5 shrink-0 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <span className="flex-1 truncate font-medium">{currentProject || "—"}</span>
            <svg className="h-3 w-3 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {projectMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setProjectMenuOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-[#e8e6dc] bg-white shadow-[0_8px_24px_rgba(20,20,19,0.08)]">
                <div className="max-h-[220px] overflow-y-auto py-1">
                  {projects.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handleSwitchProject(p.name)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-[#faf9f5] ${
                        p.name === currentProject
                          ? "text-[#141413] font-medium"
                          : "text-[#6b6963]"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: p.name === currentProject ? "#d97757" : "transparent" }}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#e8e6dc] py-1">
                  <button
                    onClick={() => {
                      setProjectMenuOpen(false);
                      setCloneName(`${currentProject}-copy`);
                      setCloneDialog(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#6b6963] transition hover:bg-[#faf9f5]"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Clone this project…
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Clone dialog ────────────────────────────────── */}
      {cloneDialog && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm"
            onClick={() => { setCloneDialog(false); setCloneError(""); }}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413] mb-1.5">
              Clone project
            </h3>
            <p className="text-[13px] text-[#6b6963] mb-4">
              Copy <span className="font-mono">{currentProject}</span> to a new project.
            </p>
            <input
              type="text"
              value={cloneName}
              onChange={(e) => { setCloneName(e.target.value); setCloneError(""); }}
              placeholder="new project name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCloneConfirm()}
              className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] focus:outline-none focus:border-[#141413]"
            />
            {cloneError && (
              <p className="mt-2 text-[12px] text-[#d97757]">{cloneError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setCloneDialog(false); setCloneError(""); }}
                className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5]"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneConfirm}
                className="rounded-lg bg-[#141413] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#2a2a28]"
              >
                Clone
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Resource area: tab nav + action + content ─────── */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-4 pt-3">
        {/* Tab nav row (finance_agent style — no underline, text color only) */}
        <div className="flex items-center justify-between shrink-0">
          <nav className="flex gap-4">
            {TABS.map((tab) => {
              const isActive = activeTabKey === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTabKey(tab.key)}
                  className={`font-['Poppins',_Arial,_sans-serif] text-[13px] font-medium transition ${
                    isActive
                      ? "text-[#141413]"
                      : "text-[#b0aea5] hover:text-[#141413]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
          {activeTabKey === "files" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              + Upload
            </button>
          )}
          {activeTabKey === "skills" && (
            <button
              onClick={() => setSkillDialog(true)}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              + New
            </button>
          )}
          {activeTabKey === "prompt" && (
            <button
              onClick={() => setCommandDialog(true)}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              + New
            </button>
          )}
          {activeTabKey === "connectors" && (
            <button
              onClick={onOpenDispatch}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              Configure
            </button>
          )}
        </div>

        {/* Tab content (scrollable, drag-drop target) */}
        <div
          className="mt-3 flex-1 overflow-y-auto min-h-0 relative -mx-2"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 mx-2 flex items-center justify-center rounded-lg border-2 border-dashed border-[#d97757] bg-white/90">
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
            <div className="mx-2 mt-1 flex items-center gap-1.5 rounded-lg bg-[#d97757]/[0.06] px-3 py-2 text-[12px] text-[#d97757]">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {uploadError}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="mx-2 mt-1 flex items-center gap-2 rounded-lg bg-[#faf9f5] px-3 py-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#e8e6dc] border-t-[#d97757]" />
              <span className="text-[12px] text-[#6b6963]">Uploading...</span>
            </div>
          )}

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

          {/* Active tab content */}
          {activeTabKey === "files" && (
            <div className="px-2 pb-2">
              {userFiles.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
                  Drop files here or click upload
                </p>
              ) : (
                userFiles.map((f) => (
                  <FileNode key={f.path} file={f} depth={0} onOpenFile={onOpenFile} />
                ))
              )}
            </div>
          )}
          {activeTabKey === "skills" && (
            <SkillsPanel skills={skillsList} onOpenFile={onOpenFile} />
          )}
          {activeTabKey === "prompt" && (
            <PromptPanel
              globalPrompt={globalPromptFile}
              commands={commandsList}
              onOpenFile={onOpenFile}
              onDeleteCommand={async (path) => {
                await api.deleteFile(serverUrl, path);
                await refreshFiles();
              }}
            />
          )}
          {activeTabKey === "connectors" && (
            <ConnectorsPanel
              serverUrl={serverUrl}
              onOpenDispatch={onOpenDispatch}
            />
          )}
        </div>
      </div>

      {/* ── Recents panel (resizable, pinned at bottom) ────── */}
      <RecentsPanel
        sessions={sessions}
        height={recentsHeight}
        isResizing={isResizingRecents}
        onStartResize={startResizingRecents}
        onOpen={onOpenFile}
        onNew={handleNewSession}
        onDelete={handleDeleteSession}
      />

      {commandDialog && (
        <CommandDialog
          onClose={() => setCommandDialog(false)}
          onCreate={handleCreateCommand}
        />
      )}
      {skillDialog && (
        <SkillDialog
          onClose={() => setSkillDialog(false)}
          onCreate={handleCreateSkill}
        />
      )}
    </div>
  );
}

// ── Skills panel — expandable tree with draggable top-level folders ──

function SkillsPanel({
  skills,
  onOpenFile,
}: {
  skills: FileEntry[];
  onOpenFile: (path: string, name: string) => void;
}) {
  if (skills.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
        No skills yet
      </div>
    );
  }
  return (
    <div className="py-1">
      {skills.map((skill) => (
        <SkillItem key={skill.path} skill={skill} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

function SkillItem({
  skill,
  onOpenFile,
}: {
  skill: FileEntry;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: "skill", path: skill.path, name: skill.name }),
          );
          e.dataTransfer.setData("x-unispace-drag", "skill");
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => setExpanded(!expanded)}
        className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-[#faf9f5]"
      >
        <svg
          className="h-4 w-4 shrink-0 text-[#d97757]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
          />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[#141413]">
          {skill.name}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-[#b0aea5] transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
      {expanded &&
        skill.children?.map((child) => (
          <SkillChildNode
            key={child.path}
            file={child}
            depth={1}
            onOpenFile={onOpenFile}
          />
        ))}
    </div>
  );
}

function SkillChildNode({
  file,
  depth,
  onOpenFile,
}: {
  file: FileEntry;
  depth: number;
  onOpenFile: (path: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDir = file.type === "directory";

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-1.5 rounded-lg py-[4px] text-[13px] transition hover:bg-[#faf9f5]"
        style={{ paddingLeft: depth * 14 + 12, paddingRight: 8 }}
        draggable={!isDir}
        onDragStart={(e) => {
          if (isDir) return;
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: "file", path: file.path, name: file.name }),
          );
          e.dataTransfer.setData("x-unispace-drag", "file");
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() =>
          isDir ? setExpanded(!expanded) : onOpenFile(file.path, file.name)
        }
      >
        {isDir ? (
          <FolderIcon open={expanded} className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" />
        ) : (
          <FileIcon className="h-3 w-3 shrink-0 text-[#d5d3ca]" />
        )}
        <span
          className={`truncate ${isDir ? "font-medium text-[#141413]" : "text-[#6b6963]"}`}
        >
          {file.name}
        </span>
      </div>
      {expanded && isDir &&
        file.children?.map((c) => (
          <SkillChildNode
            key={c.path}
            file={c}
            depth={depth + 1}
            onOpenFile={onOpenFile}
          />
        ))}
    </div>
  );
}

// ── Prompt panel — Global project prompt + draggable Commands ──

function PromptPanel({
  globalPrompt,
  commands,
  onOpenFile,
  onDeleteCommand,
}: {
  globalPrompt: FileEntry | undefined;
  commands: FileEntry[];
  onOpenFile: (path: string, name: string) => void;
  onDeleteCommand: (path: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState<FileEntry | null>(null);

  const commandIconPath =
    "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z";

  return (
    <div className="py-1">
      {/* Global section */}
      <div className="mt-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
        Global
      </div>
      {globalPrompt ? (
        <div
          onClick={() =>
            onOpenFile(globalPrompt.path || globalPrompt.name, globalPrompt.name)
          }
          className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-[#faf9f5]"
        >
          <svg
            className="h-4 w-4 shrink-0 text-[#6a9bcc]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v16.5M3.75 3.75h16.5m-16.5 0L9 9m-5.25-5.25L3.75 9m16.5-5.25v16.5m0-16.5L15 9m5.25-5.25L20.25 9M3.75 20.25h16.5m-16.5 0L9 15m-5.25 5.25L3.75 15m16.5 5.25L15 15m5.25 5.25L20.25 15"
            />
          </svg>
          <span className="min-w-0 flex-1 truncate text-[#141413]">
            Project Prompt
          </span>
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-[#b0aea5]">
          Project prompt unavailable
        </div>
      )}

      {/* Commands section */}
      <div className="mt-4 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
        Commands
      </div>
      {commands.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-[#b0aea5]">
          No commands yet. Click + New to create one.
        </div>
      ) : (
        commands.map((cmd) => {
          const displayName = cmd.name.replace(/\.md$/i, "");
          return (
            <div
              key={cmd.path}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    type: "command",
                    path: cmd.path,
                    name: displayName,
                  }),
                );
                e.dataTransfer.setData("x-unispace-drag", "command");
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onOpenFile(cmd.path, cmd.name)}
              className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-[#faf9f5]"
            >
              <svg
                className="h-4 w-4 shrink-0 text-[#a07cc5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={commandIconPath} />
              </svg>
              <span className="min-w-0 flex-1 truncate text-[#141413]">
                {displayName}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(cmd);
                }}
                className="rounded p-0.5 text-[#b0aea5] opacity-0 transition hover:text-[#d97757] group-hover:opacity-100"
                title="Delete"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete command"
          message={`Delete "${confirmDelete.name.replace(/\.md$/i, "")}" permanently?`}
          onConfirm={async () => {
            await onDeleteCommand(confirmDelete.path);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Connectors panel — inbound channel dispatch ──────────────

interface ConnectorMeta {
  id: string;
  label: string;
  description: string;
}

const CONNECTORS: ConnectorMeta[] = [
  {
    id: "feishu",
    label: "Feishu",
    description: "Lark/Feishu bot — inbound chats become sessions",
  },
];

function ConnectorsPanel({
  serverUrl,
  onOpenDispatch,
}: {
  serverUrl: string;
  onOpenDispatch: () => void;
}) {
  const [channels, setChannels] = useState<Record<string, { enabled?: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`${serverUrl}/api/channels`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setChannels(data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [serverUrl]);

  return (
    <div className="px-2 pb-2">
      {CONNECTORS.map((c) => {
        const enabled = !!channels[c.id]?.enabled;
        return (
          <button
            key={c.id}
            onClick={onOpenDispatch}
            className="group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-[#141413]/[0.03]"
          >
            <span
              className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                enabled ? "bg-[#7c9a5e]" : "bg-[#b0aea5]/40"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-[#141413]">{c.label}</span>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    enabled ? "text-[#7c9a5e]" : "text-[#b0aea5]"
                  }`}
                >
                  {enabled ? "on" : "off"}
                </span>
              </div>
              <p className="truncate text-[11px] text-[#b0aea5]">{c.description}</p>
            </div>
          </button>
        );
      })}
      <p className="px-3 pt-3 text-[10px] leading-relaxed text-[#b0aea5]">
        Click a connector to edit credentials. Changes require a server restart.
      </p>
    </div>
  );
}

// ── Recents panel (resizable sessions list) ──────────────────

function RecentsPanel({
  sessions,
  height,
  isResizing,
  onStartResize,
  onOpen,
  onNew,
  onDelete,
}: {
  sessions: FileEntry[];
  height: number;
  isResizing: boolean;
  onStartResize: (e: React.MouseEvent) => void;
  onOpen: (path: string, name: string) => void;
  onNew: () => void;
  onDelete: (path: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);
  const sorted = [...sessions].sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  );

  return (
    <div className="shrink-0">
      {/* Resize handle */}
      <div
        onMouseDown={onStartResize}
        className={`mx-4 h-px cursor-row-resize transition-colors duration-150 hover:h-[2px] hover:bg-[#b0aea5] ${
          isResizing ? "h-[2px] bg-[#b0aea5]" : "bg-[#e8e6dc]"
        }`}
      />
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="font-['Poppins',_Arial,_sans-serif] text-[13px] font-medium text-[#141413]">
          Recents
        </span>
        <button
          onClick={onNew}
          className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
        >
          + New
        </button>
      </div>
      <div className="overflow-y-auto px-2 pb-3" style={{ height }}>
        {sorted.length === 0 ? (
          <div className="px-2 py-4 text-center text-[12px] text-[#b0aea5]">
            No sessions yet
          </div>
        ) : (
          sorted.map((s) => (
            <div
              key={s.path}
              onClick={() => onOpen(s.path, s.name)}
              className="group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-[5px] text-[13px] transition hover:bg-[#faf9f5]"
            >
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[#141413]">
                  {s.channel && <ChannelBadge channel={s.channel} />}
                  {s.name}
                </span>
                {s.updatedAt && (
                  <span className="block text-[10px] leading-tight text-[#b0aea5]">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ path: s.path, name: s.name });
                }}
                className="flex h-4 w-4 items-center justify-center rounded text-[#b0aea5] opacity-0 transition hover:text-[#d97757] group-hover:opacity-100"
                title="Delete session"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete session"
          message={`Delete "${deleteTarget.name}" and its history permanently?`}
          onConfirm={() => {
            onDelete(deleteTarget.path);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
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

// ── Command dialog (create command — finance_agent style) ────

function CommandDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, text: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && text.trim() && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await onCreate(name.trim(), text.trim());
    } catch (e: any) {
      setError(e.message || "Failed to create");
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
        <h3 className="mb-4 font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413]">
          New command
        </h3>

        <label className="mb-1 block text-[12px] font-medium text-[#6b6963]">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summarize this file"
          maxLength={64}
          autoFocus
          className="mb-3 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
        />

        <label className="mb-1 block text-[12px] font-medium text-[#6b6963]">
          Prompt text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`This text will be injected into the chat input when you drag the command.\n\nExample:\nSummarize the attached file in 5 bullet points. Focus on the key decisions and open questions.`}
          className="w-full resize-y rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
        />

        {error && (
          <p className="mt-2 text-[12px] text-[#d97757]">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-[#a07cc5] px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#8e6ab3] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Skill dialog (create skill — minimal) ─────────────────────

function SkillDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onCreate(name.trim());
    } catch (e: any) {
      setError(e.message || "Failed to create");
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
        <h3 className="mb-4 font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413]">
          New skill
        </h3>

        <label className="mb-1 block text-[12px] font-medium text-[#6b6963]">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. translate-docs"
          maxLength={64}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-[13px] text-[#141413] outline-none transition focus:border-[#d97757]/60 focus:ring-1 focus:ring-[#d97757]/20"
        />
        <p className="mt-2 text-[11px] text-[#b0aea5]">
          A starter template will be created. You can edit it afterwards.
        </p>

        {error && (
          <p className="mt-2 text-[12px] text-[#d97757]">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-[#d97757] px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#c4613f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </>
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
