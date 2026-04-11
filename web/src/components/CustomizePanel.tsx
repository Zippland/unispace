import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";
import ProjectTasksPanel from "./ProjectTasksPanel";
import type { AgentEditorMode } from "./AgentEditorPanel";

// ═══════════════════════════════════════════════════════════════
//  CustomizePanel — single surface for everything that configures
//  the current project: agents / skills / dispatch / connectors /
//  tasks. Takes over the main area; the sidebar shows the vertical
//  sub-nav.
// ═══════════════════════════════════════════════════════════════

export type CustomizeSub =
  | "persona"
  | "skills"
  | "dispatch"
  | "connectors"
  | "tasks";

interface Props {
  sub: CustomizeSub;
  onClose: () => void;
  onOpenDispatch: () => void;
  onOpenAgentEditor: (mode: AgentEditorMode) => void;
  onCreateSkill: () => void;
}

const SUB_TITLES: Record<CustomizeSub, string> = {
  persona: "Persona",
  skills: "Skills",
  dispatch: "Dispatch",
  connectors: "Connectors",
  tasks: "Tasks",
};

const SUB_SUBTITLES: Record<CustomizeSub, string> = {
  persona:
    "The main persona that defines this project, plus any subagents you can switch in on demand.",
  skills: "Reusable capabilities the agent can invoke inside a project.",
  dispatch: "Inbound adapters — where the agent receives messages from.",
  connectors: "Outbound integrations — services the agent can reach out to.",
  tasks: "Recurring project operations — scheduled or on-demand.",
};

export default function CustomizePanel({
  sub,
  onClose,
  onOpenDispatch,
  onOpenAgentEditor,
  onCreateSkill,
}: Props) {
  const { files } = useStore();

  // Pull skills out of the hoisted file tree the same way Sidebar does
  const skillsFolder = files.find(
    (f) => f.name === "skills" && f.type === "directory",
  );
  const skillsList = (skillsFolder?.children || []).filter(
    (f) => f.type === "directory",
  );

  // Agents: global CLAUDE.md + .claude/agents/*.md
  const agentsFolder = files.find(
    (f) => f.name === "agents" && f.type === "directory",
  );
  const agentsList = (agentsFolder?.children || []).filter(
    (c) => c.type === "file" && c.name.toLowerCase().endsWith(".md"),
  );
  const globalPromptFile = files.find((f) => f.name === "CLAUDE.md");

  // Header action button depends on the current sub
  let headerAction: React.ReactNode = null;
  if (sub === "persona") {
    headerAction = (
      <HeaderAction
        label="New subagent"
        onClick={() => onOpenAgentEditor({ kind: "create" })}
      />
    );
  } else if (sub === "skills") {
    headerAction = <HeaderAction label="New skill" onClick={onCreateSkill} />;
  } else if (sub === "dispatch") {
    headerAction = (
      <HeaderAction label="Configure" onClick={onOpenDispatch} plus={false} />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e8e6dc] bg-white px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
              title="Back to chat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h2 className="font-['Poppins',_Arial,_sans-serif] text-[16px] font-semibold text-[#141413]">
              {SUB_TITLES[sub]}
            </h2>
          </div>
          <p className="mt-2 pl-9 text-[12px] leading-relaxed text-[#b0aea5]">
            {SUB_SUBTITLES[sub]}
          </p>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {sub === "persona" && (
          <AgentsSplit
            globalPrompt={globalPromptFile}
            agents={agentsList}
            onOpenAgentEditor={onOpenAgentEditor}
          />
        )}
        {sub === "skills" && <SkillsSplit skills={skillsList} />}
        {sub === "dispatch" && (
          <div className="mx-auto max-w-4xl px-8 py-6 overflow-y-auto h-full">
            <DispatchTable onOpenDispatch={onOpenDispatch} />
          </div>
        )}
        {sub === "connectors" && (
          <div className="mx-auto max-w-4xl px-8 py-6 overflow-y-auto h-full">
            <ConnectorsTable />
          </div>
        )}
        {sub === "tasks" && <ProjectTasksPanel />}
      </div>
    </div>
  );
}

// ── Header action pill (right side of CustomizePanel header) ──

function HeaderAction({
  label,
  onClick,
  plus = true,
}: {
  label: string;
  onClick: () => void;
  plus?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-[#2a2a28]"
    >
      {plus && (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      )}
      {label}
    </button>
  );
}

// ── Agents sub — list + inline markdown preview + Edit button ──

interface AgentRow {
  key: string;
  label: string;
  path: string;
  kind: "project-prompt" | "agent";
  lockName?: boolean;
}

function buildAgentRows(
  globalPrompt: FileEntry | undefined,
  agents: FileEntry[],
): AgentRow[] {
  const rows: AgentRow[] = [];
  if (globalPrompt) {
    rows.push({
      key: "__project_prompt__",
      label: "Main Persona",
      path: globalPrompt.path || globalPrompt.name,
      kind: "project-prompt",
      lockName: true,
    });
  }
  for (const a of agents) {
    rows.push({
      key: a.path,
      label: a.name.replace(/\.md$/i, ""),
      path: a.path,
      kind: "agent",
    });
  }
  return rows;
}

function AgentsSplit({
  globalPrompt,
  agents,
  onOpenAgentEditor,
}: {
  globalPrompt: FileEntry | undefined;
  agents: FileEntry[];
  onOpenAgentEditor: (mode: AgentEditorMode) => void;
}) {
  const { serverUrl, activeAgent, setActiveAgent } = useStore();

  // Memoize the list so the reference is stable across renders.
  // Without useMemo, every render produces a new array and every effect
  // that depends on it refires — which with content-fetching effects
  // creates a setState → rerender → refetch loop.
  const rows = useMemo(
    () => buildAgentRows(globalPrompt, agents),
    [globalPrompt, agents],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    () => rows[0]?.key ?? null,
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // If the currently selected key disappears (list shifted), fall back
  // to the first row. Only depends on rows' content via its reference,
  // which is now stable thanks to useMemo.
  useEffect(() => {
    if (selectedKey && rows.some((r) => r.key === selectedKey)) return;
    setSelectedKey(rows[0]?.key ?? null);
  }, [rows, selectedKey]);

  // Resolve the effective selection; falls back to first row if the
  // stored key is stale.
  const selectedPath = useMemo(() => {
    const match = rows.find((r) => r.key === selectedKey);
    return match?.path ?? rows[0]?.path ?? null;
  }, [rows, selectedKey]);

  // Load the selected file body — depends on the PRIMITIVE path string
  // (not an object reference), so it only re-fires when the path
  // actually changes.
  useEffect(() => {
    if (!selectedPath) {
      setContent("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .fetchFileContent(serverUrl, selectedPath)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath, serverUrl]);

  const selected = rows.find((r) => r.key === selectedKey) || rows[0] || null;

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
        No agents yet — click + New to add one.
      </div>
    );
  }

  // Strip YAML frontmatter for display
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");

  return (
    <div className="flex h-full min-h-0">
      {/* List column */}
      <div className="w-[240px] shrink-0 border-r border-[#e8e6dc] overflow-y-auto">
        <div className="py-2">
          {rows.map((row) => {
            const isSelected = row.key === selectedKey;
            const isPrompt = row.kind === "project-prompt";
            const isApplied = !isPrompt && activeAgent?.name === row.label;
            return (
              <button
                key={row.key}
                onClick={() => setSelectedKey(row.key)}
                className={`group flex w-full items-center gap-2 px-4 py-1.5 text-left text-[13px] transition ${
                  isSelected
                    ? "bg-[#141413]/[0.04] text-[#141413] font-medium"
                    : "text-[#6b6963] hover:bg-[#141413]/[0.03] hover:text-[#141413]"
                }`}
              >
                {isPrompt ? (
                  <svg className="h-3.5 w-3.5 shrink-0 text-[#6a9bcc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5M3.75 3.75h16.5m-16.5 0L9 9m-5.25-5.25L3.75 9m16.5-5.25v16.5m0-16.5L15 9m5.25-5.25L20.25 9M3.75 20.25h16.5m-16.5 0L9 15m-5.25 5.25L3.75 15m16.5 5.25L15 15m5.25 5.25L20.25 15" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 shrink-0 text-[#a07cc5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                  </svg>
                )}
                <span className="flex-1 truncate">{row.label}</span>
                {isApplied && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#7c9a5e]"
                    title="Currently active persona"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail column */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
            Loading…
          </div>
        ) : !selected ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
            Select an agent
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() =>
                  onOpenAgentEditor({
                    kind: "edit",
                    path: selected.path,
                    initialName: selected.label,
                    lockName: selected.lockName,
                  })
                }
                className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1 text-[11px] text-[#141413] transition hover:border-[#b0aea5]"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487Zm0 0L19.5 7.125" />
                </svg>
                Edit
              </button>

              {/* Active / Use-as-persona button — only for subagents,
                  the Main Persona is always on and doesn't need a toggle. */}
              {selected.kind === "agent" &&
                (() => {
                  const isApplied = activeAgent?.name === selected.label;
                  return isApplied ? (
                    <button
                      onClick={() => setActiveAgent(null)}
                      className="flex items-center gap-1.5 rounded-full bg-[#7c9a5e] px-3 py-1 text-[11px] font-medium text-white transition hover:bg-[#68864d]"
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                      Active
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveAgent({ name: selected.label })}
                      className="flex items-center gap-1.5 rounded-full border border-[#e8e6dc] bg-white px-3 py-1 text-[11px] text-[#141413] transition hover:border-[#7c9a5e] hover:text-[#7c9a5e]"
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#b0aea5]/50" />
                      Use as persona
                    </button>
                  );
                })()}
            </div>
            <div className="prose text-[14px] leading-7 text-[#141413]">
              <Markdown remarkPlugins={[remarkGfm]}>{body || "*(empty)*"}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skills sub — two-column split (list + inline detail) ───

function SkillsSplit({ skills }: { skills: FileEntry[] }) {
  const { serverUrl } = useStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(
    () => skills[0]?.children?.find((c) => c.name === "SKILL.md")?.path ?? null,
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Auto-select first skill when the list changes and nothing is selected
  useEffect(() => {
    if (selectedPath) return;
    const first = skills[0]?.children?.find((c) => c.name === "SKILL.md")?.path;
    if (first) setSelectedPath(first);
  }, [skills, selectedPath]);

  // Load content whenever the selection changes
  useEffect(() => {
    if (!selectedPath) {
      setContent("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .fetchFileContent(serverUrl, selectedPath)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPath, serverUrl]);

  if (skills.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
        No skills in this project yet.
      </div>
    );
  }

  // Strip YAML frontmatter for display
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");

  return (
    <div className="flex h-full min-h-0">
      {/* List column */}
      <div className="w-[220px] shrink-0 border-r border-[#e8e6dc] overflow-y-auto">
        <div className="py-2">
          {skills.map((skill) => {
            const skillMd = skill.children?.find((c) => c.name === "SKILL.md");
            const isActive = skillMd?.path === selectedPath;
            return (
              <button
                key={skill.path}
                onClick={() => {
                  if (skillMd) setSelectedPath(skillMd.path);
                }}
                className={`group flex w-full items-center gap-2 px-4 py-1.5 text-left text-[13px] transition ${
                  isActive
                    ? "bg-[#141413]/[0.04] text-[#141413] font-medium"
                    : "text-[#6b6963] hover:bg-[#141413]/[0.03] hover:text-[#141413]"
                }`}
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                <span className="truncate">{skill.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail column */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
            Loading…
          </div>
        ) : !selectedPath ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
            Select a skill
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-8 py-6 prose text-[14px] leading-7 text-[#141413]">
            <Markdown remarkPlugins={[remarkGfm]}>{body || "*(empty)*"}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dispatch sub ─────────────────────────────────────────────

interface DispatchMeta {
  id: string;
  label: string;
  description: string;
}

const DISPATCH_CHANNELS: DispatchMeta[] = [
  {
    id: "feishu",
    label: "Feishu",
    description: "Lark/Feishu bot — inbound chats become sessions in the current project.",
  },
];

function DispatchTable({ onOpenDispatch }: { onOpenDispatch: () => void }) {
  const { serverUrl } = useStore();
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
    <div className="divide-y divide-[#f0efe9] rounded-xl border border-[#e8e6dc] bg-white">
      {DISPATCH_CHANNELS.map((c) => {
        const enabled = !!channels[c.id]?.enabled;
        return (
          <button
            key={c.id}
            onClick={onOpenDispatch}
            className="group flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[#faf9f5]"
          >
            <span
              className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                enabled ? "bg-[#7c9a5e]" : "bg-[#b0aea5]/40"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#141413]">{c.label}</span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    enabled ? "text-[#7c9a5e]" : "text-[#b0aea5]"
                  }`}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-[#6b6963]">{c.description}</div>
            </div>
            <span className="mt-1 text-[11px] text-[#d97757] opacity-0 transition group-hover:opacity-100">
              Configure →
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Connectors sub ───────────────────────────────────────────

interface ConnectorEntry {
  id: string;
  label: string;
  description: string;
  group: "Web" | "Desktop" | "Not connected";
  emoji: string;
}

const CONNECTOR_CATALOG: ConnectorEntry[] = [
  { id: "github", label: "GitHub", description: "Repos, PRs, issues, code review.", group: "Web", emoji: "🐙" },
  { id: "notion", label: "Notion", description: "Pages, databases, comments.", group: "Web", emoji: "📓" },
  { id: "linear", label: "Linear", description: "Issues, cycles, triage.", group: "Web", emoji: "📋" },
  { id: "chrome", label: "Claude in Chrome", description: "Drive a real browser.", group: "Desktop", emoji: "🌐" },
  { id: "mac", label: "Control your Mac", description: "Click, type, screenshot.", group: "Desktop", emoji: "🖥️" },
  { id: "gmail", label: "Gmail", description: "Read and send email.", group: "Not connected", emoji: "✉️" },
  { id: "gcal", label: "Google Calendar", description: "Events, scheduling.", group: "Not connected", emoji: "📅" },
  { id: "gdrive", label: "Google Drive", description: "Files and folders.", group: "Not connected", emoji: "📁" },
];

function ConnectorsTable() {
  const groups = ["Web", "Desktop", "Not connected"] as const;
  return (
    <div className="space-y-6">
      <p className="text-[12px] leading-relaxed text-[#b0aea5]">
        Preview of what's coming. For now, wire MCP servers directly via{" "}
        <span className="font-mono text-[#6b6963]">.claude/settings.json</span>.
      </p>
      {groups.map((g) => {
        const items = CONNECTOR_CATALOG.filter((c) => c.group === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#b0aea5]">
              {g}
            </div>
            <div className="divide-y divide-[#f0efe9] rounded-xl border border-[#e8e6dc] bg-white">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 px-5 py-3.5"
                >
                  <span className="mt-0.5 text-[18px] leading-none">{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#141413]">{c.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#b0aea5]">
                        soon
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#b0aea5]">{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
