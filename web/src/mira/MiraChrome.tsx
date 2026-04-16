// ═══════════════════════════════════════════════════════════════
//  MiraChrome — the Mira sidebar scaffold (always visible, regardless
//  of mode). Brand, mode buttons, mode icons, user chip, and the
//  global Recents list. Pure visual replication of Mira's external
//  shell — demo-only, no real backend state.
//
//  Main-area mode content lives in MiraModes.tsx.
// ═══════════════════════════════════════════════════════════════

export type MiraMode = "new_chat" | "task" | "CATWORK" | "project" | "customize";

// ── Brand ─────────────────────────────────────────────────────
//
//  When `modeLabel` is supplied, a small premium pill is rendered
//  next to the "Mira" brand (e.g. Mira [PROJECT]). The whole brand
//  row becomes clickable so the user can tap to go back.

export function MiraBrand({
  modeLabel,
  onBrandClick,
}: {
  modeLabel?: string;
  onBrandClick?: () => void;
} = {}) {
  const clickable = !!onBrandClick;
  return (
    <div className="flex items-center px-5 pt-5">
      <button
        type="button"
        onClick={onBrandClick}
        disabled={!clickable}
        className={`flex items-center gap-2 rounded-md text-left transition ${
          clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
        }`}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-[14px]">
          🐱
        </div>
        <span className="font-['Poppins',_Arial,_sans-serif] text-[15px] font-semibold text-[#141413]">
          Mira
        </span>
        {modeLabel && (
          <span
            className="ml-0.5 inline-flex items-center rounded-md bg-gradient-to-br from-[#d97757] to-[#c4613f] px-1.5 py-[3px] font-['Poppins',_Arial,_sans-serif] text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_1px_3px_rgba(217,119,87,0.35)]"
          >
            {modeLabel}
          </span>
        )}
      </button>
    </div>
  );
}

// ── Mode button ───────────────────────────────────────────────

export function MiraModeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
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
      <span
        className={`inline-flex h-5 w-5 items-center justify-center ${
          active ? "text-[#d97757]" : "text-[#b0aea5]"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

// Icons for each mode (kept inline so each MiraModeButton call is self-contained)

export const MODE_ICONS = {
  new_chat: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
    </svg>
  ),
  task: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  project: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
  customize: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  market: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  ),
};

// ── User chip ─────────────────────────────────────────────────

export function MiraUserChip() {
  return (
    <div className="flex items-center gap-2 border-t border-[#e8e6dc] px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97757] text-[11px] font-semibold text-white">
        Z
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-[12px] font-medium text-[#141413]">
          Zylan Jian
        </div>
        <div className="truncate text-[10px] text-[#b0aea5]">Mira user</div>
      </div>
    </div>
  );
}

// ── Global Recents ────────────────────────────────────────────
//
//  Fetches ALL sessions across projects. Mira sessions show without
//  tag; other project sessions get a colored project label.

import { useState, useEffect } from "react";
import { useStore, type SessionInfo } from "../store";
import * as api from "../api";

export function GlobalRecentsList({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { serverUrl, setActiveSession, setActiveTab, setSessionMessages, messages } = useStore();
  const [allSessions, setAllSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    api.fetchSessions(serverUrl, true)
      .then((list: SessionInfo[]) => setAllSessions(list))
      .catch(() => {});
  }, [serverUrl]);

  const sorted = [...allSessions].sort((a, b) => b.createdAt - a.createdAt);

  async function openSession(s: SessionInfo) {
    // Switch to the session's project so ChatPanel has the right context
    if (s.projectName) {
      try {
        await api.switchProject(serverUrl, s.projectName);
        const [p, sess, f] = await Promise.all([
          api.fetchProjects(serverUrl),
          api.fetchSessions(serverUrl),
          api.fetchFiles(serverUrl),
        ]);
        useStore.getState().setProjects(p.projects, p.current);
        useStore.getState().setSessions(sess);
        useStore.getState().setFiles(f);
      } catch {}
    }
    onNavigate?.();
    setActiveSession(s.id);
    setActiveTab(null);
    if (!messages[s.id] || messages[s.id].length === 0) {
      try {
        const msgs = await api.fetchSessionMessages(serverUrl, s.id);
        if (Array.isArray(msgs) && msgs.length > 0) {
          setSessionMessages(s.id, msgs);
        }
      } catch {}
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
      <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9f9c93]">
        Recents
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="px-2 py-4 text-[12px] text-[#9f9c93]">No sessions yet</p>
        ) : (
          sorted.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[#6a685d] transition hover:bg-[rgba(41,41,31,0.04)] hover:text-[#29291f]"
            >
              {s.projectName && s.projectName !== "mira" && (
                <span className="shrink-0 rounded bg-[#f2f2ee] px-1.5 py-0.5 text-[10px] text-[#6a685d]">
                  {s.projectName}
                </span>
              )}
              <span className="truncate">{s.title || s.id}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
