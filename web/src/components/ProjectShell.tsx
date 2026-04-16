import { useState } from "react";
import { useStore } from "../store";
import ChatPanel from "./ChatPanel";
import type { MiraMode } from "../mira/MiraChrome";

// ═══════════════════════════════════════════════════════════════
//  ProjectShell — the project-mode layout.
//
//    ┌─────┬──────────────────────────┬───────────┐
//    │Icon │  Center (header + chat)  │  Setting  │
//    │Strip│                          │  Cards    │
//    │48px │        flex-1            │  280px    │
//    └─────┴──────────────────────────┴───────────┘
//
//  The icon strip replaces the full sidebar when inside a project.
//  The right panel shows Setting cards by default; when an artifact
//  is expanded from chat, it takes over the right panel.
// ═══════════════════════════════════════════════════════════════

interface Props {
  onModeChange: (mode: MiraMode) => void;
}

export default function ProjectShell({ onModeChange }: Props) {
  const { currentProject } = useStore();
  const [rightPanel, setRightPanel] = useState<"settings">("settings");

  return (
    <div className="flex h-full w-full">
      {/* ── Icon strip (left) ──────────────────────────────── */}
      <div className="flex w-12 shrink-0 flex-col items-center border-r border-[#e8e6dc] bg-white py-4">
        {/* Brand — back to CATWORK */}
        <button
          onClick={() => onModeChange("CATWORK")}
          title="Back to CATWORK"
          className="mb-6 flex h-8 w-8 items-center justify-center rounded-lg text-[16px] transition hover:bg-[#faf9f5]"
        >
          🐱
        </button>

        {/* Navigation icons */}
        {STRIP_ICONS.map((item) => (
          <button
            key={item.label}
            title={item.label}
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* ── Center (project header + chat) ─────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Project header */}
        <div className="shrink-0 border-b border-[#e8e6dc] bg-white px-8 py-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#b0aea5]">
            Project
          </div>
          <h1 className="mt-1 font-['Poppins',_Arial,_sans-serif] text-[22px] font-semibold tracking-tight text-[#141413]">
            {currentProject || "Untitled"}
          </h1>
        </div>

        {/* Chat fills remaining space */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatPanel />
        </div>
      </div>

      {/* ── Right panel (settings / artifacts) ─────────────── */}
      <div className="flex w-[280px] shrink-0 flex-col border-l border-[#e8e6dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8e6dc] px-5 py-3">
          <span className="font-['Poppins',_Arial,_sans-serif] text-[13px] font-semibold text-[#141413]">
            Setting
          </span>
          <svg className="h-4 w-4 text-[#b0aea5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <SettingCard title="Instructions/Memory" accent="#d97757">
            <p className="text-[12px] leading-relaxed text-[#6b6963]">
              Project-level instructions and memory context. Edit in the
              project's <span className="font-mono text-[11px]">CLAUDE.md</span>.
            </p>
          </SettingCard>

          <SettingCard title="Files" accent="#6a9bcc">
            <div className="space-y-1.5">
              <FileRow icon="📄" label="Project files" />
              <FileRow icon="📁" label="Sessions" />
              <FileRow icon="⚙️" label="Config" />
            </div>
          </SettingCard>

          <SettingCard title="Data Source" accent="#788c5d">
            <div className="space-y-1.5">
              <FileRow icon="🔵" label="Connected sources" />
              <FileRow icon="🟢" label="Local files" />
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}

// ── Setting card ──────────────────────────────────────────────

function SettingCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl border border-[#e8e6dc] bg-[#faf9f5] p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="font-['Poppins',_Arial,_sans-serif] text-[12px] font-semibold text-[#141413]">
          {title}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function FileRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[#6b6963]">
      <span className="text-[13px]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ── Icon strip icons ──────────────────────────────────────────

const STRIP_ICONS = [
  {
    label: "Files",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    label: "Search",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    label: "History",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Extensions",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
];
