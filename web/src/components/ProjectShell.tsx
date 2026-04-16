import { useState, useMemo, useRef, useEffect } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import ChatPanel from "./ChatPanel";
import FilesPanel, { type FilesPanelHandle } from "./FilesPanel";
import DataSourcePanel from "./DataSourcePanel";
import type { MiraMode } from "../mira/MiraChrome";

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
  onModeChange: (mode: MiraMode) => void;
  onOpenFile: (path: string, name: string) => void;
}

export default function ProjectShell({ onModeChange, onOpenFile }: Props) {
  const { currentProject, files } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    instructions: true, files: true, datasource: true, skills: true,
  });
  const filesPanelRef = useRef<FilesPanelHandle>(null);
  const toggleCard = (k: string) => setOpenCards((p) => ({ ...p, [k]: !p[k] }));

  const skillsList = useMemo(() => {
    const dir = files.find((f) => f.name === "skills" && f.type === "directory");
    return (dir?.children || []).filter((s) => s.type === "directory");
  }, [files]);
  const hasClaude = files.some((f) => f.name === "CLAUDE.md");

  // Fetch project settings (emoji, description) and CLAUDE.md content
  const { serverUrl } = useStore();
  const [projectEmoji, setProjectEmoji] = useState<string>("");
  const [projectDesc, setProjectDesc] = useState<string>("");
  const [claudeContent, setClaudeContent] = useState<string | null>(null);
  const [claudeExpanded, setClaudeExpanded] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    api.fetchProjectSettings(serverUrl, currentProject).then((s) => {
      setProjectEmoji(s.emoji || "");
      setProjectDesc(s.description || "");
    }).catch(() => {});
  }, [serverUrl, currentProject]);

  useEffect(() => {
    if (!hasClaude) { setClaudeContent(null); return; }
    api.fetchFileContent(serverUrl, "CLAUDE.md")
      .then((text) => setClaudeContent(typeof text === "string" ? text : ""))
      .catch(() => setClaudeContent(null));
  }, [serverUrl, hasClaude, currentProject]);

  return (
    <div className="flex h-full w-full">
      {/* ═══ Left sidebar (collapsed icon strip / expanded nav) ═══ */}
      <div className={`flex shrink-0 flex-col border-r border-[#e8e6dc] bg-white transition-all ${sidebarOpen ? "w-48" : "w-12"}`}>
        <div className={`flex items-center py-4 ${sidebarOpen ? "px-3 gap-2" : "flex-col px-0 items-center"}`}>
          <button onClick={() => onModeChange("CATWORK")} title="Back" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] hover:bg-[#faf9f5]">🐱</button>
          {sidebarOpen && (
            <span className="font-['Poppins',_Arial,_sans-serif] text-[14px] font-semibold text-[#141413]">Mira</span>
          )}
        </div>

        <nav className={`flex flex-col gap-0.5 ${sidebarOpen ? "px-2" : "items-center px-0"}`}>
          {STRIP_ICONS.map((i) => (
            <button
              key={i.label}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={i.label}
              className={`flex items-center gap-2.5 rounded-lg text-[#6b6963] transition hover:bg-[#faf9f5] hover:text-[#141413] ${
                sidebarOpen ? "px-3 py-2" : "h-8 w-8 justify-center"
              }`}
            >
              <span className="shrink-0 text-[#b0aea5]">{i.icon}</span>
              {sidebarOpen && <span className="text-[13px]">{i.label}</span>}
            </button>
          ))}
        </nav>

        <div className="flex-1" />
        <div className={`pb-4 ${sidebarOpen ? "px-3" : "flex justify-center"}`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97757] text-[11px] font-semibold text-white">Z</div>
        </div>
      </div>

      {/* ═══ Center ═══ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Project header */}
        <div className="shrink-0 border-b border-[#e8e6dc] bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#b0aea5]">Project</div>
              <h1 className="mt-1 flex items-center gap-2 font-['Poppins',_Arial,_sans-serif] text-[22px] font-semibold tracking-tight text-[#141413]">
                {projectEmoji && <span className="text-[24px]">{projectEmoji}</span>}
                {currentProject || "Untitled"}
              </h1>
              {projectDesc && (
                <p className="mt-0.5 text-[13px] text-[#6b6963]">{projectDesc}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <IconBtn d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              <IconBtn d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              <IconBtn d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            </div>
          </div>
        </div>

        {/* ChatPanel — handles both empty state (with Recents/Task) and active chat */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatPanel />
        </div>
      </div>

      {/* ═══ Right panel ═══ */}
      <div className="flex w-[300px] shrink-0 flex-col border-l border-[#e8e6dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8e6dc] px-5 py-3">
          <span className="font-['Poppins',_Arial,_sans-serif] text-[13px] font-semibold text-[#141413]">Setting</span>
          <svg className="h-4 w-4 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Card title="Instructions/Memory" accent="#d97757" open={openCards.instructions} onToggle={() => toggleCard("instructions")}>
            {claudeContent != null ? (
              <div>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[#6b6963]">
                  {claudeExpanded ? claudeContent : claudeContent.slice(0, 200)}
                  {!claudeExpanded && claudeContent.length > 200 && "…"}
                </p>
                {claudeContent.length > 200 && (
                  <button
                    onClick={() => setClaudeExpanded(!claudeExpanded)}
                    className="mt-2 text-[11px] font-medium text-[#d97757] hover:underline"
                  >
                    {claudeExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            ) : hasClaude ? (
              <p className="text-[12px] italic text-[#b0aea5]">Loading…</p>
            ) : (
              <p className="text-[12px] italic text-[#b0aea5]">No CLAUDE.md yet.</p>
            )}
          </Card>
          <Card title="Files" accent="#6a9bcc" open={openCards.files} onToggle={() => toggleCard("files")}>
            <div className="max-h-[300px] overflow-y-auto -mx-4 -mb-4">
              <FilesPanel ref={filesPanelRef} onOpenFile={onOpenFile} />
            </div>
          </Card>
          <Card title="Data Source" accent="#788c5d" open={openCards.datasource} onToggle={() => toggleCard("datasource")}>
            <div className="max-h-[300px] overflow-y-auto -mx-4 -mb-4">
              <DataSourcePanel pickerOpen={false} onClosePicker={() => {}} />
            </div>
          </Card>
          {skillsList.length > 0 && (
            <Card title="Skills" accent="#a07cc5" open={openCards.skills} onToggle={() => toggleCard("skills")}>
              <div className="space-y-1">
                {skillsList.map((s) => (
                  <button key={s.path} onClick={() => onOpenFile(s.path, s.name)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] text-[#6b6963] hover:bg-white hover:text-[#141413]">
                    <svg className="h-3.5 w-3.5 shrink-0 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────

function Card({ title, accent, open, onToggle, children }: {
  title: string; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e8e6dc] bg-[#faf9f5]">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-[#f0efe8]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
        <span className="flex-1 font-['Poppins',_Arial,_sans-serif] text-[12px] font-semibold text-[#141413]">{title}</span>
        <svg className={`h-3 w-3 text-[#b0aea5] transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function IconBtn({ d }: { d: string }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-md text-[#b0aea5] hover:bg-[#faf9f5] hover:text-[#141413]">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  );
}

const STRIP_ICONS = [
  { label: "Files", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
  { label: "Search", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg> },
  { label: "History", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
  { label: "Extensions", icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg> },
];
