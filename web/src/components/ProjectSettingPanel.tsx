import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import FilesPanel, { type FilesPanelHandle } from "./FilesPanel";
import DataSourcePanel from "./DataSourcePanel";

// ═══════════════════════════════════════════════════════════════
//  ProjectSettingPanel — right-side cards showing the 8 assembly
//  dimensions of a Catwork.
//
//  Each card is a summary/overview widget. Deep editing delegates
//  to existing full panels or dialogs.
// ═══════════════════════════════════════════════════════════════

interface Props {
  onOpenFile: (path: string, name: string) => void;
}

const CONNECTOR_EMOJI: Record<string, string> = {
  slack: "\u{1F4AC}",
  gmail: "\u2709\uFE0F",
  github: "\u{1F419}",
  notion: "\u{1F4D3}",
  feishu_notify: "\u{1F6CE}\uFE0F",
  linear: "\u{1F4CB}",
  chrome: "\u{1F310}",
  mac: "\u{1F5A5}\uFE0F",
};

const DISPATCH_CHANNELS = [
  { id: "feishu", label: "Feishu", description: "Lark/Feishu bot \u2014 inbound chats become sessions" },
];

const ALL_CARDS = [
  { key: "persona", label: "Persona" },
  { key: "files", label: "Files" },
  { key: "datasource", label: "Datasource" },
  { key: "skills", label: "Skills" },
  { key: "connectors", label: "Connector" },
  { key: "dispatch", label: "Dispatch" },
] as const;

const VISIBLE_KEY = "us:project_visible_cards";
const DEFAULT_VISIBLE = new Set(ALL_CARDS.map((c) => c.key));

function loadVisible(): Set<string> {
  try {
    const raw = localStorage.getItem(VISIBLE_KEY);
    if (!raw) return new Set(DEFAULT_VISIBLE);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set(DEFAULT_VISIBLE);
  } catch { return new Set(DEFAULT_VISIBLE); }
}

export default function ProjectSettingPanel({ onOpenFile }: Props) {
  const { currentProject, files, serverUrl } = useStore();

  // ── Card visibility (persisted) ──
  const [visibleCards, setVisibleCards] = useState<Set<string>>(loadVisible);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(VISIBLE_KEY, JSON.stringify([...visibleCards]));
  }, [visibleCards]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const toggleVisible = useCallback((key: string) => {
    setVisibleCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Card expand/collapse ──
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    persona: true,
    files: false,
    datasource: false,
    skills: false,
    connectors: false,
    dispatch: false,
  });
  const toggleCard = (k: string) => setOpenCards((p) => ({ ...p, [k]: !p[k] }));

  // ── Persona (CLAUDE.md) ──
  const hasClaude = files.some((f) => f.name === "CLAUDE.md");
  const [claudeContent, setClaudeContent] = useState<string | null>(null);
  const [claudeExpanded, setClaudeExpanded] = useState(false);

  useEffect(() => {
    if (!hasClaude) { setClaudeContent(null); return; }
    api.fetchFileContent(serverUrl, "CLAUDE.md")
      .then((text) => setClaudeContent(typeof text === "string" ? text : ""))
      .catch(() => setClaudeContent(null));
  }, [serverUrl, hasClaude, currentProject]);

  // ── Skills ──
  const skillsList = useMemo(() => {
    const dir = files.find((f) => f.name === "skills" && f.type === "directory");
    return (dir?.children || []).filter((s) => s.type === "directory");
  }, [files]);

  // ── Files panel ref ──
  const filesPanelRef = useRef<FilesPanelHandle>(null);

  return (
    <div className="w-[320px] shrink-0 overflow-y-auto p-3 space-y-3">
        {/* ── Settings gear ── */}
        <div className="flex justify-end" ref={settingsRef}>
          <div className="relative">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#9f9c93] hover:bg-[rgba(41,41,31,0.06)] hover:text-[#29291f]"
              title="Toggle cards"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-8 z-10 w-[180px] rounded-[10px] border border-[rgba(41,41,31,0.1)] bg-white py-1 shadow-lg">
                {ALL_CARDS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => toggleVisible(c.key)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#29291f] hover:bg-[rgba(41,41,31,0.04)]"
                  >
                    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${visibleCards.has(c.key) ? "border-[#29291f] bg-[#29291f] text-white" : "border-[#b0aea5]"}`}>
                      {visibleCards.has(c.key) && "\u2713"}
                    </span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 1. Persona ── */}
        {visibleCards.has("persona") && <SettingSection title="Persona" open={openCards.persona} onToggle={() => toggleCard("persona")}>
          {claudeContent != null ? (
            <div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#29291f]">
                {claudeExpanded ? claudeContent : claudeContent.slice(0, 200)}
                {!claudeExpanded && claudeContent.length > 200 && "\u2026"}
              </p>
              {claudeContent.length > 200 && (
                <button
                  onClick={() => setClaudeExpanded(!claudeExpanded)}
                  className="mt-2 text-[11px] font-medium text-[#29291f] hover:underline"
                >
                  {claudeExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          ) : hasClaude ? (
            <p className="text-[12px] italic text-[#9f9c93]">Loading\u2026</p>
          ) : (
            <p className="text-[12px] italic text-[#9f9c93]">No CLAUDE.md yet.</p>
          )}
        </SettingSection>}

        {/* ── 2. Files ── */}
        {visibleCards.has("files") && <SettingSection title="Files" open={openCards.files} onToggle={() => toggleCard("files")}>
          <div className="max-h-[300px] overflow-y-auto -mx-[12px] -mb-[12px]">
            <FilesPanel ref={filesPanelRef} onOpenFile={onOpenFile} />
          </div>
        </SettingSection>}

        {/* ── 4. Datasource ── */}
        {visibleCards.has("datasource") && <SettingSection title="Datasource" open={openCards.datasource} onToggle={() => toggleCard("datasource")}>
          <div className="max-h-[300px] overflow-y-auto -mx-[12px] -mb-[12px]">
            <DataSourcePanel pickerOpen={false} onClosePicker={() => {}} />
          </div>
        </SettingSection>}

        {/* ── 5. Skill ── */}
        {visibleCards.has("skills") && skillsList.length > 0 && (
          <SettingSection title="Skills" open={openCards.skills} onToggle={() => toggleCard("skills")}>
            <div className="space-y-1">
              {skillsList.map((s) => (
                <button key={s.path} onClick={() => onOpenFile(s.path, s.name)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[14px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]">
                  <svg className="h-3.5 w-3.5 shrink-0 text-[#9f9c93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </SettingSection>
        )}

        {/* ── 7. Connector ── */}
        {visibleCards.has("connectors") && <SettingSection title="Connector" open={openCards.connectors} onToggle={() => toggleCard("connectors")}>
          <ConnectorSummaryList />
        </SettingSection>}

        {/* ── 8. Dispatch ── */}
        {visibleCards.has("dispatch") && <SettingSection title="Dispatch" open={openCards.dispatch} onToggle={() => toggleCard("dispatch")}>
          <DispatchSummaryList />
        </SettingSection>}
    </div>
  );
}

// ── SettingSection (collapsible card) ────────────────────────

function SettingSection({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[rgba(41,41,31,0.1)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-[12px] py-3 text-left hover:bg-[rgba(41,41,31,0.03)]">
        <span className="flex-1 text-[14px] font-light text-[#9f9c93]">{title}</span>
        <svg className={`h-3 w-3 text-[#9f9c93] transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-[12px] pb-[12px]">{children}</div>}
    </div>
  );
}

// ── ConnectorSummaryList ─────────────────────────────────────

function ConnectorSummaryList() {
  const { serverUrl, connected, currentProject } = useStore();
  const [items, setItems] = useState<api.ConnectorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    api.fetchConnectors(serverUrl)
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [serverUrl, connected, currentProject]);

  if (loading && items.length === 0) {
    return <p className="text-[12px] italic text-[#9f9c93]">Loading\u2026</p>;
  }
  if (items.length === 0) {
    return <p className="text-[12px] italic text-[#9f9c93]">No connectors installed.</p>;
  }

  return (
    <div className="space-y-0.5">
      {items.map((c) => (
        <div key={c.id} title={c.description} className="flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]">
          <span className="text-[12px] leading-none">{CONNECTOR_EMOJI[c.type] || "\u{1F50C}"}</span>
          <span className="min-w-0 flex-1 truncate">{c.display_name || c.name}</span>
          <span className="text-[10px] text-[#b0aea5]">{c.actions.length} action{c.actions.length === 1 ? "" : "s"}</span>
        </div>
      ))}
    </div>
  );
}

// ── DispatchSummaryList ──────────────────────────────────────

function DispatchSummaryList() {
  const { serverUrl } = useStore();
  const [channels, setChannels] = useState<Record<string, { enabled?: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`${serverUrl}/api/channels`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setChannels(data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serverUrl]);

  return (
    <div className="space-y-1">
      {DISPATCH_CHANNELS.map((c) => {
        const enabled = !!channels[c.id]?.enabled;
        return (
          <div key={c.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]">
            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${enabled ? "bg-[#7c9a5e]" : "bg-[#b0aea5]/40"}`} />
            <span className="min-w-0 flex-1">{c.label}</span>
            <span className={`text-[10px] uppercase tracking-wide ${enabled ? "text-[#7c9a5e]" : "text-[#b0aea5]"}`}>
              {enabled ? "on" : "off"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
