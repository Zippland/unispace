import { useState, useMemo, useEffect, useRef } from "react";
import { useStore } from "../store";
import * as api from "../api";
import ChatPanel from "./ChatPanel";
import ProjectSettingPanel from "./ProjectSettingPanel";
import ArtifactsPanel from "./ArtifactsPanel";
import { type MiraMode, GlobalRecentsList } from "../mira/MiraChrome";

// ═══════════════════════════════════════════════════════════════
//  ProjectShell — the project-mode layout.
//
//    ┌─────┬─────────────────────────────┬──────────┐
//    │Icon │  Center                     │ Setting  │
//    │Strip│  landing | chat             │ Cards    │
//    │48px │         flex-1              │  ~300px  │
//    └─────┴─────────────────────────────┴──────────┘
//
//  Center: landing page (no session) | ChatPanel (active session).
//  Right:  functional sub-panels as collapsible cards.
// ═══════════════════════════════════════════════════════════════

interface Props {
  miraMode: MiraMode;
  onModeChange: (mode: MiraMode) => void;
  onOpenFile: (path: string, name: string) => void;
}

export default function ProjectShell({ miraMode, onModeChange, onOpenFile }: Props) {
  const { currentProject, projects, pinnedProjects, activeSessionId, sessions, serverUrl: storeUrl, activeTab } = useStore();
  const currentProjectInfo = projects.find((p) => p.id === currentProject);
  const projectDisplayName = currentProjectInfo?.name || currentProject;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isConversation = !!activeSessionId;

  function goHome() {
    onModeChange("new_chat");
    useStore.getState().setActiveSession(null);
    useStore.getState().setActiveTab(null);
    const mira = projects.find((p) => p.slug === "mira");
    (mira ? api.switchProject(storeUrl, mira.id) : Promise.resolve()).then(async () => {
      const [p, s, f] = await Promise.all([
        api.fetchProjects(storeUrl),
        api.fetchSessions(storeUrl),
        api.fetchFiles(storeUrl),
      ]);
      useStore.getState().setProjects(p.projects, p.current);
      useStore.getState().setSessions(s);
      useStore.getState().setFiles(f);
    }).catch(() => {});
  }

  // Active session title for breadcrumb
  const activeSessionTitle = useMemo(() => {
    if (!activeSessionId) return "";
    const s = sessions.find((x) => x.id === activeSessionId);
    return s?.title || activeSessionId;
  }, [activeSessionId, sessions]);

  // Fetch project settings (emoji, description)
  const { serverUrl } = useStore();
  const [projectEmoji, setProjectEmoji] = useState<string>("");
  const [projectDesc, setProjectDesc] = useState<string>("");

  useEffect(() => {
    if (!currentProject) return;
    api.fetchProjectSettings(serverUrl, currentProject).then((s) => {
      setProjectEmoji(s.emoji || "");
      setProjectDesc(s.description || "");
    }).catch(() => {});
  }, [serverUrl, currentProject]);

  // ── Project switcher popover ──
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcherOpen) return;
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  async function switchTo(name: string) {
    setSwitcherOpen(false);
    try {
      await api.switchProject(storeUrl, name);
      const [p, s, f] = await Promise.all([
        api.fetchProjects(storeUrl),
        api.fetchSessions(storeUrl),
        api.fetchFiles(storeUrl),
      ]);
      useStore.getState().setProjects(p.projects, p.current);
      useStore.getState().setSessions(s);
      useStore.getState().setFiles(f);
    } catch {}
  }

  const otherProjects = projects.filter((p) => p.id !== currentProject && p.slug !== "mira");

  return (
    <div className="flex h-full w-full">
      {/* ═══ Left sidebar: collapsed (68px icons) / expanded (240px full) ═══ */}
      {sidebarOpen ? (
        <div className="flex w-[240px] shrink-0 flex-col bg-[#f2f2ee] overflow-hidden">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between px-5 pt-5">
            <button onClick={goHome} className="flex items-center gap-2 rounded-md text-left transition">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-[14px]">🐱</div>
              <span className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">Mira</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} title="Collapse" className="flex h-6 w-6 items-center justify-center rounded-md text-[#9f9c93] transition hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="mt-4 flex flex-col px-3">
            <SidebarNavBtn label="New Chat" active={miraMode === "new_chat"} onClick={goHome}
              d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            <SidebarNavBtn label="Task" active={false}
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            <SidebarNavBtn label="Project" active={miraMode === "CATWORK" || miraMode === "project"} onClick={() => onModeChange("CATWORK")}
              d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            <SidebarNavBtn label="Market" active={false} onClick={() => onModeChange("CATWORK")}
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </nav>

          {/* Pin */}
          {pinnedProjects.length > 0 && (
            <div className="mt-3 border-t border-[#e8e6dc] px-3 pt-3">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">Pin</div>
              {pinnedProjects.map((pinId) => {
                const p = projects.find((pr) => pr.id === pinId);
                if (!p) return null;
                return (
                  <button key={pinId} onClick={async () => {
                    await api.switchProject(storeUrl, pinId);
                    const [pr, s, f] = await Promise.all([api.fetchProjects(storeUrl), api.fetchSessions(storeUrl), api.fetchFiles(storeUrl)]);
                    useStore.getState().setProjects(pr.projects, pr.current);
                    useStore.getState().setSessions(s);
                    useStore.getState().setFiles(f);
                  }} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition hover:bg-[#141413]/[0.04] hover:text-[#141413] ${currentProject === pinId ? "text-[#141413] font-medium" : "text-[#6b6963]"}`}>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recents */}
          <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[#e8e6dc] pt-3">
            <GlobalRecentsList onNavigate={() => setSidebarOpen(false)} />
          </div>

          {/* User chip */}
          <div className="flex items-center gap-2 border-t border-[#e8e6dc] px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#29291f] text-[11px] font-semibold text-white">Z</div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[12px] font-medium text-[#141413]">Mira user</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-[68px] shrink-0 flex-col items-center bg-[#f2f2ee] px-[12px]">
          {/* Logo */}
          <div className="flex h-[52px] items-center justify-center pt-[20px]">
            <button onClick={goHome} title="Mira Home" className="flex size-[22px] items-center justify-center text-[16px]">🐱</button>
          </div>

          {/* Nav icons */}
          <nav className="flex flex-1 flex-col items-center gap-[4px]">
            <NavIcon label="Sidebar" active={false} onClick={() => setSidebarOpen(true)}
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            <NavIcon label="Search" active={false}
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            <NavIcon label="New Chat" active={miraMode === "new_chat"} onClick={goHome}
              d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            <NavIcon label="Task" active={false}
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            <NavIcon label="Project" active={miraMode === "CATWORK" || miraMode === "project"} onClick={() => onModeChange("CATWORK")}
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            <NavIcon label="Market" active={false}
              d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </nav>

          {/* User avatar */}
          <div className="flex items-center justify-center py-[16px]">
            <div className="flex size-[24px] items-center justify-center rounded-full bg-[#29291f] text-[10px] font-semibold text-white">Z</div>
          </div>
        </div>
      )}

      {/* ═══ Center ═══ */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#fafaf7]">
        {isConversation ? (
          /* Conversation — breadcrumb header + chat */
          <>
            <div className="shrink-0 px-[12px] py-[14px]">
              <div className="flex items-center gap-[4px] text-[14px]">
                <button
                  onClick={() => useStore.getState().setActiveSession(null)}
                  className="flex items-center gap-1 font-medium text-[#6a685d] hover:text-[#29291f]"
                >
                  {projectEmoji && <span>{projectEmoji}</span>}
                  <span>{projectDisplayName}</span>
                </button>
                <span className="text-[#6a685d]">/</span>
                <span className="font-medium text-[#29291f]">{activeSessionTitle}</span>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <ChatPanel variant="project" />
            </div>
          </>
        ) : (
          /* Project homepage — header + ChatPanel (empty state with Recents/Task) + right panel */
          <>
            <div className="shrink-0 px-[20px] py-[14px]">
              <div className="flex items-center justify-between">
                <div className="text-[14px] font-medium text-[#29291f]">Project</div>
                <div className="flex items-center gap-1">
                  <IconBtn d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  <IconBtn d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  <IconBtn d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                </div>
              </div>
              <div className="relative mt-2" ref={switcherRef}>
                <button
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className="flex items-center gap-2 text-[30px] font-light tracking-tight text-[#29291f] hover:text-[#6a685d]"
                >
                  {projectEmoji && <span className="text-[30px]">{projectEmoji}</span>}
                  <span>{projectDisplayName || "Untitled"}</span>
                  <svg className={`h-4 w-4 text-[#9f9c93] transition ${switcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {switcherOpen && otherProjects.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-[280px] w-[260px] overflow-y-auto rounded-[10px] border border-[rgba(41,41,31,0.1)] bg-white py-1 shadow-lg">
                    {otherProjects.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => switchTo(p.name)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-[#29291f] hover:bg-[rgba(41,41,31,0.04)]"
                      >
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {projectDesc && (
                <p className="mt-0.5 text-[16px] font-light text-[#9f9c93]">{projectDesc}</p>
              )}
            </div>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <ChatPanel variant="project" />
              </div>
              {/* Right Setting panel — homepage only */}
            </div>
          </>
        )}
      </div>

      {/* ═══ Right panel: Artifacts (file open) or Settings cards ═══ */}
      {miraMode === "project" && (
        activeTab ? (
          <ArtifactsPanel />
        ) : (
          <ProjectSettingPanel onOpenFile={onOpenFile} />
        )
      )}
    </div>
  );
}

function IconBtn({ d }: { d: string }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#9f9c93] hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f]">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  );
}

function SidebarNavBtn({ label, active, onClick, d }: {
  label: string; active: boolean; onClick?: () => void; d: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
        active
          ? "bg-[#141413]/[0.05] text-[#141413] font-medium"
          : "text-[#6b6963] hover:bg-[#141413]/[0.03] hover:text-[#141413]"
      }`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center ${active ? "text-[#d97757]" : "text-[#b0aea5]"}`}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}

function NavIcon({ label, active, onClick, d }: {
  label: string; active: boolean; onClick?: () => void; d: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex size-[36px] items-center justify-center rounded-[8px] p-[8px] transition ${
        active ? "bg-[rgba(41,41,31,0.06)] text-[#29291f]" : "text-[#6a685d] hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f]"
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  );
}
