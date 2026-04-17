import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useStore, type FileEntry, type SessionInfo } from "../store";
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

  // ── Connectors ──
  const [connectorPickerOpen, setConnectorPickerOpen] = useState(false);
  const [connectorRefreshKey, setConnectorRefreshKey] = useState(0);

  return (
    <div className="w-[380px] shrink-0 overflow-y-auto p-3 space-y-3">
        {/* ── Settings header ── */}
        <div className="flex items-center justify-between" ref={settingsRef}>
          <span className="text-[14px] font-semibold text-[#6a685d]">Setting</span>
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
              <div className="absolute right-0 top-8 z-10 w-[220px] rounded-[12px] border border-[rgba(41,41,31,0.1)] bg-white py-2 shadow-[0_8px_24px_rgba(20,20,19,0.12)]">
                {ALL_CARDS.map((c) => {
                  const visible = visibleCards.has(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggleVisible(c.key)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-[rgba(41,41,31,0.03)]"
                    >
                      {/* Drag handle dots */}
                      <svg className="h-4 w-4 shrink-0 text-[#b0aea5]" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
                        <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
                        <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
                      </svg>
                      <span className="flex-1 text-[#29291f]">{c.label}</span>
                      {/* Eye icon */}
                      <svg className={`h-4 w-4 shrink-0 ${visible ? "text-[#9f9c93]" : "text-[#b0aea5]/50"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        {visible ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        )}
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 1. Persona ── */}
        {visibleCards.has("persona") && <SettingSection title="Instructions/Memory">
          {claudeContent != null ? (
            <div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#29291f]">
                {claudeExpanded ? claudeContent : claudeContent.slice(0, 200)}
                {!claudeExpanded && claudeContent.length > 200 && "\u2026"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {claudeContent.length > 200 && (
                  <button onClick={() => setClaudeExpanded(!claudeExpanded)} className="text-[11px] font-medium text-[#29291f] hover:underline">
                    {claudeExpanded ? "Show less" : "Show more"}
                  </button>
                )}
                <button onClick={() => onOpenFile("CLAUDE.md", "CLAUDE.md")} className="ml-auto text-[11px] text-[#d97757] hover:underline">Edit</button>
              </div>
            </div>
          ) : hasClaude ? (
            <p className="text-[12px] italic text-[#9f9c93]">Loading\u2026</p>
          ) : (
            <button onClick={async () => { await api.saveFile(serverUrl, "CLAUDE.md", "# Agent Persona\n\n"); onOpenFile("CLAUDE.md", "CLAUDE.md"); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e8e6dc] py-3 text-[12px] text-[#9f9c93] transition hover:border-[#d97757] hover:text-[#d97757]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Create Persona
            </button>
          )}
        </SettingSection>}

        {/* ── 2. Files ── */}
        {visibleCards.has("files") && <SettingSection title="Files">
          <div className="max-h-[300px] overflow-y-auto -mx-[12px]">
            <FilesPanel ref={filesPanelRef} onOpenFile={onOpenFile} />
          </div>
          <button onClick={() => filesPanelRef.current?.openUpload()}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e8e6dc] py-2 text-[11px] text-[#9f9c93] transition hover:border-[#d97757] hover:text-[#d97757]">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            Upload files
          </button>
        </SettingSection>}

        {/* ── 4. Datasource ── */}
        {visibleCards.has("datasource") && <SettingSection title="Data Source">
          <DatasourceCardContent />
        </SettingSection>}

        {/* ── 5. Skill ── */}
        {visibleCards.has("skills") && (
          <SettingSection title="Skills">
            <div className="space-y-1">
              {skillsList.map((s) => (
                <button key={s.path} onClick={() => onOpenFile(s.path, s.name)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[14px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]">
                  <svg className="h-3.5 w-3.5 shrink-0 text-[#9f9c93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
            <label className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e8e6dc] py-2 text-[11px] text-[#9f9c93] transition hover:border-[#d97757] hover:text-[#d97757]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
              Upload skill (.zip)
              <input type="file" accept=".zip" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const name = file.name.replace(/\.zip$/, "");
                  await api.uploadFile(serverUrl, file, `.claude/skills/${name}/`);
                  const updatedFiles = await api.fetchFiles(serverUrl);
                  useStore.getState().setFiles(updatedFiles);
                } catch (err) { console.error("Skill upload failed:", err); }
                e.target.value = "";
              }} />
            </label>
          </SettingSection>
        )}

        {/* ── 7. Connector ── */}
        {visibleCards.has("connectors") && <SettingSection title="Connector">
          <ConnectorSummaryList onRefresh={() => setConnectorRefreshKey((k) => k + 1)} />
          {connectorPickerOpen ? (
            <ConnectorCatalogPicker onClose={() => { setConnectorPickerOpen(false); setConnectorRefreshKey((k) => k + 1); }} />
          ) : (
            <button onClick={() => setConnectorPickerOpen(true)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e8e6dc] py-2 text-[11px] text-[#9f9c93] transition hover:border-[#d97757] hover:text-[#d97757]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add connector
            </button>
          )}
        </SettingSection>}

        {/* ── 8. Dispatch ── */}
        {visibleCards.has("dispatch") && <SettingSection title="Dispatch">
          <DispatchSummaryList />
        </SettingSection>}
    </div>
  );
}

// ── SettingSection (collapsible card) ────────────────────────

function SettingSection({ title, children }: {
  title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(41,41,31,0.08)] bg-[#fafaf7] transition hover:shadow-[0_4px_16px_rgba(20,20,19,0.08)]">
      <div className="px-[14px] pt-3 pb-1 text-[14px] font-light text-[#9f9c93]">{title}</div>
      <div className="px-[14px] pb-[14px]">{children}</div>
    </div>
  );
}

// ── ConnectorSummaryList ─────────────────────────────────────

function DatasourceCardContent() {
  const { serverUrl } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!e.dataTransfer.types.includes("x-unispace-drag")) return;
    const dragType = e.dataTransfer.getData("x-unispace-drag");
    if (dragType !== "session") return;
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.sessionId) {
        await api.mountSessionAsDatasource(serverUrl, data.sessionId);
        setRefreshKey((k) => k + 1);
      }
    } catch {}
  }

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes("x-unispace-drag")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`transition ${dragOver ? "rounded-lg ring-2 ring-[#d97757] ring-offset-2" : ""}`}
    >
      <div className="max-h-[300px] overflow-y-auto -mx-[12px]" key={refreshKey}>
        <DataSourcePanel pickerOpen={false} onClosePicker={() => {}} />
      </div>
      {sessionPickerOpen ? (
        <SessionQuickPicker onClose={() => { setSessionPickerOpen(false); setRefreshKey((k) => k + 1); }} />
      ) : (
        <button onClick={() => setSessionPickerOpen(true)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e8e6dc] py-2 text-[11px] text-[#9f9c93] transition hover:border-[#d97757] hover:text-[#d97757]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
          Mount session
        </button>
      )}
    </div>
  );
}

function SessionQuickPicker({ onClose }: { onClose: () => void }) {
  const { serverUrl, currentProject, projects } = useStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.fetchSessions(serverUrl, true)
      .then((list: SessionInfo[]) => setSessions(list.filter((s) => s.projectId !== currentProject)))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [serverUrl, currentProject]);

  function projectName(id?: string) {
    return projects.find((p) => p.id === id)?.name || (id || "").slice(0, 8);
  }

  async function handleMount(sessionId: string) {
    setBusy(sessionId);
    try {
      await api.mountSessionAsDatasource(serverUrl, sessionId);
      onClose();
    } catch {}
    setBusy(null);
  }

  return (
    <div className="mt-2 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-[#6b6963]">Mount a session</span>
        <button onClick={onClose} className="text-[#b0aea5] hover:text-[#141413]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {loading ? (
        <p className="text-[11px] text-[#b0aea5]">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-[11px] text-[#b0aea5]">No sessions from other projects</p>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-[12px] hover:bg-white">
              <span className="shrink-0 rounded bg-[#141413]/[0.06] px-1 py-0.5 text-[10px] font-medium text-[#6b6963]">{projectName(s.projectId)}</span>
              <span className="min-w-0 flex-1 truncate text-[#29291f]">{s.title || s.id.slice(0, 8)}</span>
              <button onClick={() => handleMount(s.id)} disabled={busy === s.id}
                className="shrink-0 text-[10px] text-[#d97757] hover:underline disabled:opacity-50">
                {busy === s.id ? "..." : "Mount"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectorSummaryList({ onRefresh }: { onRefresh?: () => void }) {
  const { serverUrl, connected, currentProject } = useStore();
  const [items, setItems] = useState<api.ConnectorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    if (!connected) return;
    setLoading(true);
    api.fetchConnectors(serverUrl)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [serverUrl, connected]);

  useEffect(() => { refresh(); }, [refresh, currentProject, refreshKey]);
  // parent can bump refreshKey via onRefresh
  useEffect(() => { if (onRefresh) onRefresh(); }, []);

  async function handleUninstall(id: string) {
    try {
      await api.uninstallConnector(serverUrl, id);
      setRefreshKey((k) => k + 1);
    } catch {}
  }

  if (loading && items.length === 0) {
    return <p className="text-[12px] italic text-[#9f9c93]">Loading\u2026</p>;
  }
  if (items.length === 0) {
    return <p className="text-[12px] italic text-[#9f9c93]">No connectors installed.</p>;
  }

  return (
    <div className="space-y-0.5">
      {items.map((c) => (
        <div key={c.id} title={c.description} className="group flex items-center gap-2 rounded-md px-1 py-1 text-[13px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]">
          <span className="text-[12px] leading-none">{CONNECTOR_EMOJI[c.type] || "\u{1F50C}"}</span>
          <span className="min-w-0 flex-1 truncate">{c.display_name || c.name}</span>
          <span className="text-[10px] text-[#b0aea5] group-hover:hidden">{c.actions.length} action{c.actions.length === 1 ? "" : "s"}</span>
          <button onClick={() => handleUninstall(c.id)} className="hidden text-[#b0aea5] hover:text-red-500 group-hover:block" title="Uninstall">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function ConnectorCatalogPicker({ onClose }: { onClose: () => void }) {
  const { serverUrl } = useStore();
  const [catalog, setCatalog] = useState<api.ConnectorCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchConnectorCatalog(serverUrl)
      .then(setCatalog)
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [serverUrl]);

  async function handleInstall(id: string) {
    try {
      await api.installConnector(serverUrl, id);
      setCatalog((prev) => prev.map((c) => c.id === id ? { ...c, installed: true } : c));
    } catch {}
  }

  return (
    <div className="mt-2 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-[#6b6963]">Catalog</span>
        <button onClick={onClose} className="text-[#b0aea5] hover:text-[#141413]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {loading ? (
        <p className="text-[11px] text-[#b0aea5]">Loading...</p>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {catalog.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-[12px]">
              <span className="text-[11px]">{CONNECTOR_EMOJI[c.type] || "\u{1F50C}"}</span>
              <span className="min-w-0 flex-1 truncate text-[#29291f]">{c.display_name || c.name}</span>
              {c.installed ? (
                <span className="text-[10px] text-[#788c5d]">Installed</span>
              ) : (
                <button onClick={() => handleInstall(c.id)} className="text-[10px] text-[#d97757] hover:underline">Install</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DispatchSummaryList ──────────────────────────────────────

function DispatchSummaryList() {
  const { serverUrl, openDispatch } = useStore();
  const [channels, setChannels] = useState<Record<string, { enabled?: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`${serverUrl}/api/channels`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setChannels(data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serverUrl]);

  function handleClick(id: string) {
    const ch = channels[id] || {};
    openDispatch(id, JSON.stringify({ id, mode: "custom_bot", enabled: !!ch.enabled, bot_name: "", app_id: "", app_secret: "", welcome_message: "" }));
  }

  return (
    <div className="space-y-1">
      {DISPATCH_CHANNELS.map((c) => {
        const enabled = !!channels[c.id]?.enabled;
        return (
          <div
            key={c.id}
            onClick={() => handleClick(c.id)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[13px] text-[#29291f] hover:bg-[rgba(41,41,31,0.06)]"
          >
            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${enabled ? "bg-[#7c9a5e]" : "bg-[#b0aea5]/40"}`} />
            <span className="min-w-0 flex-1">{c.label}</span>
            <span className={`text-[10px] uppercase tracking-wide ${enabled ? "text-[#7c9a5e]" : "text-[#b0aea5]"}`}>
              {enabled ? "on" : "off"}
            </span>
          </div>
        );
      })}
      <button
        onClick={() => openDispatch("__new__", JSON.stringify({ id: "", mode: "mira_bot", enabled: true, bot_name: "", app_id: "", app_secret: "", welcome_message: "" }))}
        className="mt-1 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[12px] text-[#b0aea5] hover:bg-[rgba(41,41,31,0.06)] hover:text-[#6b6963]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add dispatch
      </button>
    </div>
  );
}
