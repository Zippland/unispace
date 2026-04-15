import { useState, useRef, useCallback, useEffect } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import DataSourcePanel from "./DataSourcePanel";
import FilesPanel, { type FilesPanelHandle } from "./FilesPanel";

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

// ── Workspace resource tabs ───────────────────────────────────
// The top-level resource tab strip is dynamic now: the visible
// tabs come from the `promotedTabs` prop (driven by the eye toggles
// in the customize sub-nav). Tab labels are derived from the
// shared customize registry, so adding a new promotable resource
// is a one-line edit in src/lib/customize.ts.

// ── Paths (mirror server hoisting) ────────────────────────────

const AGENTS_DIR = ".claude/agents";
const SKILLS_DIR = ".claude/skills";

// ── Recents panel height ──────────────────────────────────────

const RECENTS_MIN_HEIGHT = 80;
const RECENTS_MAX_HEIGHT = 500;
const RECENTS_HEIGHT_KEY = "us:recents_height";

// ── Sidebar ───────────────────────────────────────────────────

import type { AgentEditorMode } from "./AgentEditorPanel";
import { subMeta, type CustomizeSub } from "../lib/customize";
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
  /** Promotable subs currently pinned to the sidebar top tab strip,
   *  in display order. Driven by the eye toggles in CustomizePanel. */
  promotedTabs: CustomizeSub[];
  miraMode: MiraMode;
  onMiraModeChange: (mode: MiraMode) => void;
}

export default function Sidebar({
  onOpenFile,
  onOpenSettings,
  onOpenDispatch,
  onOpenAgentEditor,
  customizeSub,
  onCustomizeSubChange,
  promotedTabs,
  miraMode,
  onMiraModeChange,
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

  // Sidebar resource tab. Customize is no longer a peer — it lives in
  // its own slide-in column, opened via the gear icon next to the
  // project switcher. The visible tab strip is dynamic, derived from
  // the `promotedTabs` prop. The active tab tracks the user's last
  // pick but auto-falls-back if it gets unpromoted.
  const [sidebarTab, setSidebarTab] = useState<CustomizeSub | null>(
    () => promotedTabs[0] ?? null,
  );

  // If the active tab is no longer in the promoted set (user just
  // unpinned it via the eye toggle), fall back to the first promoted
  // tab. If nothing is promoted, leave it null and show an empty hint.
  useEffect(() => {
    if (sidebarTab && promotedTabs.includes(sidebarTab)) return;
    setSidebarTab(promotedTabs[0] ?? null);
  }, [promotedTabs, sidebarTab]);

  const activeTabKey = sidebarTab;

  // Datasource picker dialog open state (demo — handled inside the panel).
  const [dsPickerOpen, setDsPickerOpen] = useState(false);

  // Imperative handle to FilesPanel — lets the tab nav header host
  // the + Upload button while FilesPanel keeps ownership of the
  // hidden file input + drag/drop logic.
  const filesPanelRef = useRef<FilesPanelHandle>(null);

  // Lightweight toast for sidebar-side demo actions ("+ New task")
  const [sidebarToast, setSidebarToast] = useState<string | null>(null);
  function flashSidebarToast(msg: string) {
    setSidebarToast(msg);
    window.setTimeout(() => setSidebarToast(null), 2400);
  }

  function handleTopTabClick(next: CustomizeSub) {
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
    setFiles(await api.fetchFiles(serverUrl));
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

  // ── Session actions ─────────────────────────────────────
  function handleNewSession() {
    setActiveSession(null);
    setActiveTab(null);
  }

  async function handleDeleteSession(sessionPath: string) {
    const id = sessionPath.replace("sessions/", "").replace(".json", "");
    await api.deleteSession(serverUrl, id);
    removeSession(id);
    setFiles(await api.fetchFiles(serverUrl));
  }

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
        modeLabel={inProject ? "Cattery" : undefined}
        onBrandClick={inProject ? () => onMiraModeChange("cattery") : undefined}
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
            active={miraMode === "cattery"}
            onClick={() => onMiraModeChange("cattery")}
            label="Cattery"
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
            {/* ── Project switcher row + customize gear ────── */}
            <div className="flex items-center gap-1">
            <div className="relative flex-1 min-w-0">
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
            <button
              onClick={() => onCustomizeSubChange(customizeSub ? null : "files")}
              title={customizeSub ? "Close customize" : "Open customize"}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                customizeSub
                  ? "bg-[#141413]/[0.06] text-[#141413]"
                  : "text-[#b0aea5] hover:bg-[#141413]/[0.04] hover:text-[#141413]"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.108 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
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

      {/* ── Resource area: dynamic tab nav + content ─────── */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-4 pt-3">
        {/* Top-level tab nav — built from `promotedTabs` (eye toggles
            in customize sub-nav). Empty state if nothing promoted. */}
        <div className="flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-4 overflow-x-auto">
            {promotedTabs.map((key) => {
              const isActive = activeTabKey === key;
              const meta = subMeta(key);
              return (
                <button
                  key={key}
                  onClick={() => handleTopTabClick(key)}
                  className={`font-['Poppins',_Arial,_sans-serif] text-[13px] font-medium transition ${
                    isActive
                      ? "text-[#141413]"
                      : "text-[#b0aea5] hover:text-[#141413]"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
            {promotedTabs.length === 0 && (
              <span className="text-[12px] text-[#b0aea5]">
                Open Customize to pin resources here
              </span>
            )}
          </nav>
          {activeTabKey === "files" && (
            <button
              onClick={() => filesPanelRef.current?.openUpload()}
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
          {activeTabKey === "command" && (
            <button
              onClick={() =>
                onOpenAgentEditor({ kind: "create", target: "command" })
              }
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
            >
              + New
            </button>
          )}
          {activeTabKey === "tasks" && (
            <button
              onClick={() => onCustomizeSubChange("tasks")}
              className="cursor-pointer text-xs text-[#d97757] transition hover:text-[#c4613f] hover:underline"
              title="Open the Tasks manager"
            >
              + New
            </button>
          )}
        </div>

        {/* Tab content (scrollable) */}
        <div className="mt-3 flex-1 overflow-y-auto min-h-0 relative -mx-2">
          {activeTabKey === "files" && (
            <FilesPanel ref={filesPanelRef} onOpenFile={onOpenFile} />
          )}
          {activeTabKey === "datasource" && (
            <DataSourcePanel
              pickerOpen={dsPickerOpen}
              onClosePicker={() => setDsPickerOpen(false)}
            />
          )}
          {activeTabKey === "command" && (
            <SidebarCommandList
              files={files}
              onOpenAgentEditor={onOpenAgentEditor}
            />
          )}
          {activeTabKey === "tasks" && <SidebarTaskList />}
          {activeTabKey === null && (
            <div className="px-3 py-4 text-[12px] text-[#b0aea5]">
              No resources pinned. Click the gear icon and pin one with the
              eye toggle.
            </div>
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

      {sidebarToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#141413] px-4 py-2 text-[12px] text-white shadow-lg">
          {sidebarToast}
        </div>
      )}
    </div>
  );
}

// ── Sidebar command list — compact rows for CLAUDE.md + commands ──
// Renders inside the sidebar's Command tab when promoted. Click a row
// to open it in the main-area AgentEditor.

function SidebarCommandList({
  files,
  onOpenAgentEditor,
}: {
  files: FileEntry[];
  onOpenAgentEditor: (mode: AgentEditorMode) => void;
}) {
  const claudeMd = files.find((f) => f.name === "CLAUDE.md");
  const commandsFolder = files.find(
    (f) => f.name === "commands" && f.type === "directory",
  );
  const commandFiles = (commandsFolder?.children || []).filter(
    (c) => c.type === "file" && c.name.toLowerCase().endsWith(".md"),
  );

  const rows: { key: string; label: string; path: string; lockName?: boolean }[] = [];
  if (claudeMd) {
    rows.push({
      key: "__claude_md__",
      label: "CLAUDE.md",
      path: claudeMd.path || claudeMd.name,
      lockName: true,
    });
  }
  for (const c of commandFiles) {
    rows.push({
      key: c.path,
      label: c.name.replace(/\.md$/i, ""),
      path: c.path,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[12px] text-[#b0aea5]">
        No commands yet — click + New
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      {rows.map((row) => (
        <button
          key={row.key}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(
              "application/json",
              JSON.stringify({
                type: "command",
                path: row.path,
                name: row.label,
              }),
            );
            e.dataTransfer.setData("x-unispace-drag", "command");
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() =>
            onOpenAgentEditor({
              kind: "edit",
              path: row.path,
              initialName: row.label,
              lockName: row.lockName,
            })
          }
          className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5] hover:text-[#141413]"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[#d97757]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <span className="flex-1 truncate">{row.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Sidebar task list — compact rows backed by /api/tasks ──
// Shows the project's real `.claude/tasks/*.md` entries. Each row
// is draggable into the chat input; dropping it treats the task's
// body as a reference resource (see ChatPanel handleInputDrop).

const TRIGGER_ICON: Record<string, string> = {
  manual: "🖐️",
  fixed: "⏰",
  model: "🤖",
};

function SidebarTaskList() {
  const { serverUrl, connected, currentProject } = useStore();
  const [tasks, setTasks] = useState<api.TaskFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    api
      .fetchTasks(serverUrl)
      .then((t) => {
        if (!cancelled) setTasks(t);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, connected, currentProject]);

  if (loading && tasks.length === 0) {
    return <div className="px-3 py-3 text-[11px] text-[#b0aea5]">Loading…</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="px-3 py-4 text-[11px] leading-relaxed text-[#b0aea5]">
        No tasks yet. Click the{" "}
        <span className="font-medium text-[#6b6963]">+ New</span> button above
        to create one.
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      {tasks.map((t) => {
        const icon = TRIGGER_ICON[t.trigger] || "📌";
        return (
          <div
            key={t.name}
            draggable
            title={t.description || t.name}
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                  type: "task",
                  id: t.name,
                  path: t.name,
                  name: t.name,
                  label: t.name,
                  description: t.description,
                }),
              );
              e.dataTransfer.setData("x-unispace-drag", "task");
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5] hover:text-[#141413]"
          >
            <span className="text-[12px] leading-none">{icon}</span>
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
          </div>
        );
      })}
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

const CONNECTOR_EMOJI: Record<string, string> = {
  slack: "💬",
  gmail: "✉️",
  github: "🐙",
  notion: "📓",
  feishu_notify: "🛎️",
  linear: "📋",
  chrome: "🌐",
  mac: "🖥️",
};

function connectorEmoji(type: string): string {
  return CONNECTOR_EMOJI[type] || "🔌";
}

function ConnectorsPanel() {
  const { serverUrl, connected, currentProject } = useStore();
  const [items, setItems] = useState<api.ConnectorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    api
      .fetchConnectors(serverUrl)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, connected, currentProject]);

  const byType = new Map<string, api.ConnectorSummary[]>();
  for (const c of items) {
    if (!byType.has(c.type)) byType.set(c.type, []);
    byType.get(c.type)!.push(c);
  }

  return (
    <div className="px-2 pb-2">
      {loading && items.length === 0 && (
        <p className="px-3 py-3 text-[11px] text-[#b0aea5]">Loading…</p>
      )}

      {!loading && items.length === 0 && (
        <p className="px-3 py-4 text-[11px] leading-relaxed text-[#b0aea5]">
          No connectors installed. Open the Connectors sub-page to browse the
          catalog.
        </p>
      )}

      {[...byType.entries()].map(([type, list]) => (
        <div key={type} className="mt-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
            {type}
          </div>
          {list.map((c) => (
            <div
              key={c.id}
              title={c.description}
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition hover:bg-[#141413]/[0.03]"
            >
              <span className="mt-0.5 text-[14px] leading-none">
                {connectorEmoji(c.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-[#141413]">
                    {c.display_name || c.name}
                  </span>
                  {c.is_demo && (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-[#b0aea5]">
                      demo
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-[#b0aea5]">
                  {c.actions.length} action{c.actions.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
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
