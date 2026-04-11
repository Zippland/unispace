import { useState, useRef, useCallback, useEffect } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import { SHOW_ALL_FILES_KEY } from "../api";
import DataSourcePanel from "./DataSourcePanel";

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
  "agents",
]);

// ── Workspace resource tabs ───────────────────────────────────

type TabKey = "files" | "datasource" | "customize";

const TABS: { key: TabKey; label: string }[] = [
  { key: "files", label: "Files" },
  { key: "datasource", label: "Datasource" },
  { key: "customize", label: "Customize" },
];

// Sub-tabs inside the Customize panel (CustomizeSub type imported below)
// Order: persona first (most common config), tasks last (least frequent)
const CUSTOMIZE_SUBS: {
  key: "persona" | "skills" | "dispatch" | "connectors" | "tasks";
  label: string;
}[] = [
  { key: "persona", label: "Persona" },
  { key: "skills", label: "Skills" },
  { key: "dispatch", label: "Dispatch" },
  { key: "connectors", label: "Connectors" },
  { key: "tasks", label: "Tasks" },
];

// ── Paths (mirror server hoisting) ────────────────────────────

const AGENTS_DIR = ".claude/agents";
const SKILLS_DIR = ".claude/skills";

// ── Recents panel height ──────────────────────────────────────

const RECENTS_MIN_HEIGHT = 80;
const RECENTS_MAX_HEIGHT = 500;
const RECENTS_HEIGHT_KEY = "us:recents_height";

// ── Files view mode (folder tree vs. time-sorted flat list) ───

type FileViewMode = "folder" | "timeline";
const FILE_VIEW_MODE_KEY = "us:file_view_mode";

/** Walk a nested FileEntry tree and return every leaf (file, not dir),
 *  sorted by updatedAt descending. Used for the timeline view. */
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

/** Keyword-filter a file tree: keep matching files and any directories
 *  that have at least one matching descendant. Empty dirs are pruned. */
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

/** Keyword-filter a flat file list. */
function filterFlat(files: FileEntry[], keyword: string): FileEntry[] {
  const k = keyword.trim().toLowerCase();
  if (!k) return files;
  return files.filter((f) => f.name.toLowerCase().includes(k));
}

/** Short relative time: "now" | "3h" | "2d" | "4m" (month) | "1y". */
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

/** Bucket a time-sorted flat file list into Today / Yesterday / This week
 *  / This month / Older groups. Empty buckets are dropped. */
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

// ── Sidebar ───────────────────────────────────────────────────

import type { AgentEditorMode } from "./AgentEditorPanel";
import type { CustomizeSub } from "./CustomizePanel";
import {
  MiraBrand,
  MiraModeButton,
  MiraUserChip,
  GlobalRecentsList,
  MODE_ICONS,
  type MiraMode,
} from "../mira/MiraChrome";

interface SidebarProps {
  onOpenFile: (path: string, name: string) => void;
  onOpenSettings: () => void;
  onOpenDispatch: () => void;
  onOpenAgentEditor: (mode: AgentEditorMode) => void;
  customizeSub: CustomizeSub | null;
  onCustomizeSubChange: (sub: CustomizeSub | null) => void;
  miraMode: MiraMode;
  onMiraModeChange: (mode: MiraMode) => void;
  onOpenProjectWelcome: () => void;
}

export default function Sidebar({
  onOpenFile,
  onOpenSettings,
  onOpenDispatch,
  onOpenAgentEditor,
  customizeSub,
  onCustomizeSubChange,
  miraMode,
  onMiraModeChange,
  onOpenProjectWelcome,
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
    activeAgent,
    setActiveAgent,
  } = useStore();

  // Project switcher state
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [cloneDialog, setCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneError, setCloneError] = useState("");
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<string | null>(null);
  const [projectDeleteError, setProjectDeleteError] = useState("");

  // Sidebar-only tab state (files vs. datasource). Customize is a
  // separate dimension because it drives a main-area takeover via
  // customizeSub; when customizeSub is set it wins as the active tab.
  const [sidebarTab, setSidebarTab] = useState<"files" | "datasource">("files");
  const activeTabKey: TabKey = customizeSub ? "customize" : sidebarTab;

  // Datasource picker dialog open state (demo — handled inside the panel).
  const [dsPickerOpen, setDsPickerOpen] = useState(false);

  // Files panel view mode — "folder" tree or "timeline" flat list by mtime.
  // Persisted so the choice sticks across reloads.
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(() => {
    if (typeof window === "undefined") return "folder";
    const saved = window.localStorage.getItem(FILE_VIEW_MODE_KEY);
    return saved === "timeline" ? "timeline" : "folder";
  });
  useEffect(() => {
    window.localStorage.setItem(FILE_VIEW_MODE_KEY, fileViewMode);
  }, [fileViewMode]);

  // Client-side file search — filters both view modes.
  const [fileSearch, setFileSearch] = useState("");

  // "Show all" — bypass the hoisted/ignored filter and fetch the raw
  // project tree. Persisted in localStorage under the same key that
  // api.fetchFiles reads, so the server call auto-includes ?all=1.
  const [showAllFiles, setShowAllFiles] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SHOW_ALL_FILES_KEY) === "1";
  });
  useEffect(() => {
    window.localStorage.setItem(SHOW_ALL_FILES_KEY, showAllFiles ? "1" : "0");
    // Refetch so the server returns the right tree under the new flag.
    api.fetchFiles(serverUrl).then(setFiles).catch(() => {});
  }, [showAllFiles, serverUrl, setFiles]);

  function handleTopTabClick(next: TabKey) {
    if (next === "customize") {
      if (!customizeSub) onCustomizeSubChange("persona");
      return;
    }
    // Files / Datasource — sidebar-only, close any customize takeover
    onCustomizeSubChange(null);
    setSidebarTab(next);
  }

  // Dialog state for create-skill (commands/prompt editing lives in the
  // main area via onOpenAgentEditor, not a modal)
  const [skillDialog, setSkillDialog] = useState(false);

  function slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  async function handleDeleteProjectConfirm() {
    if (!projectDeleteTarget) return;
    try {
      await api.deleteProject(serverUrl, projectDeleteTarget);
      const projectsResp = await api.fetchProjects(serverUrl);
      useStore
        .getState()
        .setProjects(projectsResp.projects, projectsResp.current);
      setProjectDeleteTarget(null);
      setProjectDeleteError("");
    } catch (e: any) {
      setProjectDeleteError(e?.message || "Failed to delete");
    }
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

  // In "show all" mode, surface the raw tree as-is. Otherwise strip
  // entries surfaced under their own tabs (CLAUDE.md, sessions, etc.)
  // so they don't appear twice.
  const userFiles = showAllFiles
    ? files
    : files.filter((f) => !HOISTED_NAMES.has(f.name));
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

  const agentsFolder = files.find(
    (f) => f.name === "agents" && f.type === "directory",
  );
  const agentsList = (agentsFolder?.children || []).filter(
    (c) => c.type === "file" && c.name.toLowerCase().endsWith(".md"),
  );

  const globalPromptFile = files.find((f) => f.name === "CLAUDE.md");

  const inProject = miraMode === "project";

  return (
    <div className="flex flex-col h-full bg-white/60 overflow-hidden">
      {/* ── Mira brand ────────────────────────────────────── */}
      {/*   Project mode: brand gets a "/ Project" chip and acts as a
           back button to the mode hub. Other modes: plain brand. */}
      <MiraBrand
        modeLabel={inProject ? "Project" : undefined}
        onBrandClick={inProject ? () => onMiraModeChange("new_chat") : undefined}
      />

      {/* ── Mira mode buttons (hidden in Project mode) ────── */}
      {!inProject && (
        <nav className="mt-4 flex flex-col px-3">
          <MiraModeButton
            active={miraMode === "new_chat"}
            onClick={() => onMiraModeChange("new_chat")}
            label="New Chat"
            icon={MODE_ICONS.new_chat}
          />
          <MiraModeButton
            active={miraMode === "task"}
            onClick={() => onMiraModeChange("task")}
            label="Task"
            icon={MODE_ICONS.task}
          />
          <MiraModeButton
            active={false /* we're inside !inProject */}
            onClick={() => onMiraModeChange("project")}
            label="Project"
            icon={MODE_ICONS.project}
          />
          <MiraModeButton
            active={miraMode === "customize"}
            onClick={() => onMiraModeChange("customize")}
            label="Customize"
            icon={MODE_ICONS.customize}
          />
        </nav>
      )}

      {/* ── Non-project mode: show global Recents ────────── */}
      {miraMode !== "project" && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-[#e8e6dc] pt-3">
          <GlobalRecentsList />
        </div>
      )}

      {/* ── Project mode: existing UniSpace sidebar body ─── */}
      {miraMode === "project" && (
        <>
          {/* ── Project header (project switcher only) ───── */}
          <div className="px-3 pt-5 pb-3">
            {/* ── Project switcher ──────────────────────── */}
            <div className="relative">
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-[#141413]/[0.04]"
          >
            <svg className="h-4 w-4 shrink-0 text-[#b0aea5] transition group-hover:text-[#6b6963]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            <span className="flex-1 truncate font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold tracking-tight text-[#141413]">
              {currentProject || "—"}
            </span>
            <svg className="h-3 w-3 shrink-0 text-[#b0aea5] opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  {projects.map((p) => {
                    const isCurrent = p.name === currentProject;
                    const isOnly = projects.length <= 1;
                    const canDelete = !isCurrent && !isOnly;
                    return (
                      <div
                        key={p.name}
                        className="group flex items-center gap-2 pr-1.5 transition hover:bg-[#faf9f5]"
                      >
                        <button
                          onClick={() => handleSwitchProject(p.name)}
                          className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
                            isCurrent
                              ? "text-[#141413] font-medium"
                              : "text-[#6b6963]"
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{
                              background: isCurrent ? "#d97757" : "transparent",
                            }}
                          />
                          <span className="flex-1 truncate">{p.name}</span>
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectDeleteTarget(p.name);
                              setProjectMenuOpen(false);
                            }}
                            title="Delete project"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#b0aea5] opacity-0 transition hover:text-[#d97757] group-hover:opacity-100"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-[#e8e6dc] py-1">
                  <button
                    onClick={() => {
                      setProjectMenuOpen(false);
                      onOpenProjectWelcome();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#d97757] transition hover:bg-[#faf9f5]"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New from template…
                  </button>
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

      {/* ── Delete project confirm dialog ───────────────── */}
      {projectDeleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#141413]/20 backdrop-blur-sm"
            onClick={() => {
              setProjectDeleteTarget(null);
              setProjectDeleteError("");
            }}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-[0_16px_48px_rgba(20,20,19,0.15)]">
            <h3 className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413] mb-1.5">
              Delete project
            </h3>
            <p className="text-[13px] leading-relaxed text-[#6b6963] mb-2">
              Delete <span className="font-mono text-[#141413]">{projectDeleteTarget}</span> and
              all of its sessions, files, skills, and agents?
            </p>
            <p className="text-[12px] leading-relaxed text-[#d97757] mb-4">
              This cannot be undone.
            </p>
            {projectDeleteError && (
              <p className="mb-4 text-[12px] text-[#d97757]">{projectDeleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setProjectDeleteTarget(null);
                  setProjectDeleteError("");
                }}
                className="rounded-lg border border-[#e8e6dc] px-4 py-1.5 text-[13px] text-[#6b6963] hover:bg-[#faf9f5]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProjectConfirm}
                className="rounded-lg bg-[#d97757] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#c4613f]"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Resource area: tab nav + action + content ─────── */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-4 pt-3">
        {/* Top-level tab nav (Files / Agents / Customize) */}
        <div className="flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-4 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTabKey === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTopTabClick(tab.key)}
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
          {activeTabKey === "datasource" && (
            <button
              onClick={() => setDsPickerOpen(true)}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              + Add
            </button>
          )}
          {/* Customize sub actions now live in CustomizePanel's main-area
              header, not here — keeps the sidebar chrome minimal. */}
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
              {/* Search input + view mode + show-all toggles — always
                  visible so users can reach the show-all toggle even on
                  empty projects where userFiles has been filtered out. */}
              <div className="mb-2 flex items-center gap-1.5 px-1">
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
                    {/* shield-check — conveys "elevated privilege" at both
                        rest and active; active state is driven by bg color. */}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </button>
                </div>

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

                // timeline mode — flat, search-filtered, grouped by recency
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
          )}
          {activeTabKey === "datasource" && (
            <DataSourcePanel
              pickerOpen={dsPickerOpen}
              onClosePicker={() => setDsPickerOpen(false)}
            />
          )}
          {activeTabKey === "customize" && (
            /* Vertical sub-nav. The actual content/config lives in the
               CustomizePanel in the main area. */
            <nav className="px-2 pb-2 pt-1 space-y-0.5">
              {CUSTOMIZE_SUBS.map((sub) => {
                const isActive = customizeSub === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => onCustomizeSubChange(sub.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                      isActive
                        ? "bg-[#141413]/[0.04] text-[#141413] font-medium"
                        : "text-[#6b6963] hover:bg-[#141413]/[0.03] hover:text-[#141413]"
                    }`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        isActive ? "bg-[#d97757]" : "bg-transparent"
                      }`}
                    />
                    <span className="flex-1">{sub.label}</span>
                  </button>
                );
              })}
            </nav>
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

          {skillDialog && (
            <SkillDialog
              onClose={() => setSkillDialog(false)}
              onCreate={handleCreateSkill}
            />
          )}
        </>
      )}

      {/* ── Mira user chip (always at bottom) ─────────────── */}
      <MiraUserChip />
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

// ── Prompt panel — Global project prompt + Subagents ─────────

function PromptPanel({
  globalPrompt,
  agents,
  activeAgentName,
  onApplyAgent,
  onEditProjectPrompt,
  onEditAgent,
  onDeleteAgent,
}: {
  globalPrompt: FileEntry | undefined;
  agents: FileEntry[];
  activeAgentName: string | null;
  onApplyAgent: (agent: FileEntry) => void;
  onEditProjectPrompt: () => void;
  onEditAgent: (agent: FileEntry) => void;
  onDeleteAgent: (path: string, name: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState<FileEntry | null>(null);

  const agentIconPath =
    "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z";

  return (
    <div className="py-1">
      {/* Global section */}
      <div className="mt-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
        Global
      </div>
      {globalPrompt ? (
        <div
          onClick={onEditProjectPrompt}
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

      {/* Subagents section */}
      <div className="mt-4 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
        Subagents
      </div>
      {agents.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-[#b0aea5]">
          No subagents yet. Click + New to create one.
        </div>
      ) : (
        agents.map((agent) => {
          const displayName = agent.name.replace(/\.md$/i, "");
          const isActive = activeAgentName === displayName;
          return (
            <div
              key={agent.path}
              onClick={() => onEditAgent(agent)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition ${
                isActive
                  ? "bg-[#a07cc5]/[0.08] ring-1 ring-inset ring-[#a07cc5]/20"
                  : "hover:bg-[#faf9f5]"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0 text-[#a07cc5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={agentIconPath} />
              </svg>
              <span className="min-w-0 flex-1 truncate text-[#141413]">
                {displayName}
              </span>
              {isActive && (
                <span className="shrink-0 rounded-full bg-[#a07cc5]/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[#a07cc5]">
                  active
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyAgent(agent);
                }}
                className="rounded p-0.5 text-[#b0aea5] opacity-0 transition hover:text-[#a07cc5] group-hover:opacity-100"
                title={isActive ? "Already active" : "Use as agent"}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(agent);
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
          title="Delete subagent"
          message={`Delete "${confirmDelete.name.replace(/\.md$/i, "")}" permanently?`}
          onConfirm={async () => {
            await onDeleteAgent(confirmDelete.path, confirmDelete.name);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Dispatch panel — inbound channel adapters (Feishu, Slack, …) ─

interface DispatchMeta {
  id: string;
  label: string;
  description: string;
}

const DISPATCH_CHANNELS: DispatchMeta[] = [
  {
    id: "feishu",
    label: "Feishu",
    description: "Lark/Feishu bot — inbound chats become sessions",
  },
];

function DispatchPanel({
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
      <p className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-[#b0aea5]">
        Inbound adapters — where the agent receives messages from. Each
        external chat becomes a session in the current project.
      </p>
      {DISPATCH_CHANNELS.map((c) => {
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
    </div>
  );
}

// ── Connectors panel — outbound integrations (MCP / external apps) ─

interface ConnectorEntry {
  id: string;
  label: string;
  group: "Web" | "Desktop" | "Not connected";
  emoji: string;
}

const CONNECTOR_CATALOG: ConnectorEntry[] = [
  { id: "github", label: "GitHub", group: "Web", emoji: "🐙" },
  { id: "notion", label: "Notion", group: "Web", emoji: "📓" },
  { id: "linear", label: "Linear", group: "Web", emoji: "📋" },
  { id: "chrome", label: "Claude in Chrome", group: "Desktop", emoji: "🌐" },
  { id: "mac", label: "Control your Mac", group: "Desktop", emoji: "🖥️" },
  { id: "gmail", label: "Gmail", group: "Not connected", emoji: "✉️" },
  { id: "gcal", label: "Google Calendar", group: "Not connected", emoji: "📅" },
  { id: "gdrive", label: "Google Drive", group: "Not connected", emoji: "📁" },
];

function ConnectorsPanel() {
  const groups = ["Web", "Desktop", "Not connected"] as const;
  return (
    <div className="px-2 pb-2">
      <p className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-[#b0aea5]">
        Outbound integrations — services the agent can reach out to. Wire
        these up through MCP servers.
      </p>
      {groups.map((g) => {
        const items = CONNECTOR_CATALOG.filter((c) => c.group === g);
        if (items.length === 0) return null;
        return (
          <div key={g} className="mt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
              {g}
            </div>
            {items.map((c) => (
              <div
                key={c.id}
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition hover:bg-[#141413]/[0.03]"
              >
                <span className="mt-0.5 text-[14px] leading-none">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[#141413]">
                      {c.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-[#b0aea5]">
                      soon
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <p className="px-3 pt-4 text-[10px] leading-relaxed text-[#b0aea5]">
        Connector management is a preview of what's coming — for now, wire
        MCP servers directly via <span className="font-mono">.claude/settings.json</span>.
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
        {timeLabel && (
          <span className="shrink-0 text-[10px] tabular-nums text-[#b0aea5] group-hover:hidden">
            {timeLabel}
          </span>
        )}
        {file.type === "file" && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
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

// ── Skill dialog (create skill — minimal) ─────────────────────

export function SkillDialog({
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
