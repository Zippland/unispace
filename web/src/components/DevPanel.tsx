import { useEffect, useState } from "react";
import { useStore } from "../store";

// ═══════════════════════════════════════════════════════════════
//  Inspector — project introspection (dev-only).
//  Reports only what the server can honestly see on disk + in memory.
//  Does NOT pretend to show the SDK's real system prompt or tool list —
//  those are SDK-owned and opaque to the server.
// ═══════════════════════════════════════════════════════════════

interface AgentMeta {
  name: string;
  description: string;
  path: string;
  bytes: number;
  preview: string;
}

interface SkillMeta {
  name: string;
  description: string;
  path: string;
  preview: string;
}

interface InspectData {
  project: { name: string; path: string; sessionCount: number };
  claudeMd: string | null;
  settings: unknown;
  agents: AgentMeta[];
  skills: SkillMeta[];
  runtime: {
    settingSources: string[];
    permissionMode: string;
    allowDangerouslySkipPermissions: boolean;
    sdkVersion: string | null;
  };
}

type Tab = "project" | "agents" | "skills" | "runtime";

export default function DevPanel() {
  const { serverUrl, activeSessionId, activeAgent, messages } = useStore();
  const [tab, setTab] = useState<Tab>("project");
  const [data, setData] = useState<InspectData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    fetch(`${serverUrl}/api/debug/inspect`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-white">
      {/* Header — compact dev badge + tab nav + refresh */}
      <div className="flex items-center justify-between border-b border-[#e8e6dc] bg-white px-4 shrink-0">
        <nav className="flex gap-4">
          {([
            { id: "project", label: "Project" },
            { id: "agents", label: "Agents" },
            { id: "skills", label: "Skills" },
            { id: "runtime", label: "Runtime" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative py-3 font-['Poppins',_Arial,_sans-serif] text-[12px] font-medium tracking-tight transition ${
                tab === t.id
                  ? "text-[#141413]"
                  : "text-[#b0aea5] hover:text-[#141413]"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full bg-[#d97757]" />
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
            title="Refresh"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
          <span className="font-['Poppins',_Arial,_sans-serif] text-[10px] font-semibold uppercase tracking-widest text-[#d97757]">
            Inspector
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#b0aea5]">
            Loading…
          </div>
        ) : !data ? (
          <div className="flex h-full items-center justify-center text-[13px] text-[#d97757]">
            Failed to load inspect data
          </div>
        ) : tab === "project" ? (
          <ProjectTab data={data} />
        ) : tab === "agents" ? (
          <AgentsTab
            agents={data.agents}
            activeAgentName={activeAgent?.name || null}
          />
        ) : tab === "skills" ? (
          <SkillsTab skills={data.skills} />
        ) : (
          <RuntimeTab
            data={data}
            activeSessionId={activeSessionId}
            activeAgentName={activeAgent?.name || null}
            messageCount={
              activeSessionId ? (messages[activeSessionId]?.length || 0) : 0
            }
          />
        )}
      </div>
    </div>
  );
}

// ── Project tab ──────────────────────────────────────────────

function ProjectTab({ data }: { data: InspectData }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-5">
      <Section label="Current project">
        <KeyValue label="Name" value={data.project.name} mono />
        <KeyValue label="Path" value={data.project.path} mono />
        <KeyValue
          label="Sessions"
          value={String(data.project.sessionCount)}
        />
        <KeyValue label="Agents" value={String(data.agents.length)} />
        <KeyValue label="Skills" value={String(data.skills.length)} />
      </Section>

      <Section label="CLAUDE.md (project prompt)">
        <p className="mb-2 text-[11px] leading-relaxed text-[#b0aea5]">
          This is the project-level instructions loaded at the start of every
          session. It's <span className="text-[#d97757]">one input</span> to
          the SDK's final system prompt, not the whole thing — SDK also
          prepends its Claude Code preset and appends dynamic sections
          (working dir, git status, tool descriptions).
        </p>
        {data.claudeMd ? (
          <pre className="max-h-[340px] select-all overflow-auto whitespace-pre-wrap rounded-lg border border-[#e8e6dc] bg-[#faf9f5] p-4 font-mono text-[12px] leading-5 text-[#141413]">
            {data.claudeMd}
          </pre>
        ) : (
          <Empty>No CLAUDE.md at project root</Empty>
        )}
      </Section>

      <Section label=".claude/settings.json">
        {data.settings ? (
          <pre className="select-all overflow-auto rounded-lg border border-[#e8e6dc] bg-[#faf9f5] p-4 font-mono text-[12px] leading-5 text-[#141413]">
            {JSON.stringify(data.settings, null, 2)}
          </pre>
        ) : (
          <Empty>Not configured</Empty>
        )}
      </Section>
    </div>
  );
}

// ── Agents tab ───────────────────────────────────────────────

function AgentsTab({
  agents,
  activeAgentName,
}: {
  agents: AgentMeta[];
  activeAgentName: string | null;
}) {
  if (agents.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Empty>No subagents in .claude/agents/</Empty>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-5">
      {agents.map((a) => {
        const isActive = activeAgentName === a.name;
        return (
          <div
            key={a.path}
            className={`rounded-lg border transition ${
              isActive
                ? "border-[#a07cc5]/40 bg-[#a07cc5]/[0.04]"
                : "border-[#e8e6dc] bg-white"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-[#e8e6dc] px-4 py-2.5">
              <svg
                className="h-4 w-4 shrink-0 text-[#a07cc5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span className="font-mono text-[13px] font-semibold text-[#141413]">
                {a.name}
              </span>
              {isActive && (
                <span className="rounded-full bg-[#a07cc5]/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[#a07cc5]">
                  active
                </span>
              )}
              <span className="ml-auto text-[10px] text-[#b0aea5]">
                {a.bytes.toLocaleString()} B
              </span>
            </div>
            <div className="px-4 py-3 text-[12px]">
              <div className="mb-2 text-[11px] text-[#b0aea5]">{a.path}</div>
              {a.description && (
                <div className="mb-2 text-[13px] text-[#6b6963]">
                  <span className="text-[10px] uppercase tracking-wider text-[#b0aea5]">
                    Description:{" "}
                  </span>
                  {a.description}
                </div>
              )}
              {a.preview && (
                <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md bg-[#faf9f5] p-3 font-mono text-[11px] leading-5 text-[#6b6963]">
                  {a.preview}
                  {a.preview.length >= 240 && "…"}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Skills tab ───────────────────────────────────────────────

function SkillsTab({ skills }: { skills: SkillMeta[] }) {
  if (skills.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Empty>No skills in .claude/skills/</Empty>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-5">
      {skills.map((s) => (
        <div
          key={s.path}
          className="rounded-lg border border-[#e8e6dc] bg-white"
        >
          <div className="flex items-center gap-2 border-b border-[#e8e6dc] px-4 py-2.5">
            <svg
              className="h-4 w-4 shrink-0 text-[#d97757]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
            <span className="font-mono text-[13px] font-semibold text-[#141413]">
              {s.name}
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="mb-2 text-[11px] text-[#b0aea5]">{s.path}</div>
            {s.description && (
              <div className="text-[13px] text-[#6b6963]">{s.description}</div>
            )}
            {s.preview && (
              <pre className="mt-2 max-h-[140px] overflow-auto whitespace-pre-wrap rounded-md bg-[#faf9f5] p-3 font-mono text-[11px] leading-5 text-[#6b6963]">
                {s.preview}
                {s.preview.length >= 240 && "…"}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Runtime tab ──────────────────────────────────────────────

function RuntimeTab({
  data,
  activeSessionId,
  activeAgentName,
  messageCount,
}: {
  data: InspectData;
  activeSessionId: string | null;
  activeAgentName: string | null;
  messageCount: number;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-5">
      <Section label="SDK">
        <KeyValue
          label="Package"
          value="@anthropic-ai/claude-agent-sdk"
          mono
        />
        <KeyValue
          label="Version"
          value={data.runtime.sdkVersion || "unknown"}
          mono
        />
      </Section>

      <Section label="Query options (per-turn)">
        <KeyValue
          label="settingSources"
          value={JSON.stringify(data.runtime.settingSources)}
          mono
        />
        <KeyValue
          label="permissionMode"
          value={data.runtime.permissionMode}
          mono
        />
        <KeyValue
          label="allowDangerouslySkipPermissions"
          value={String(data.runtime.allowDangerouslySkipPermissions)}
          mono
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#b0aea5]">
          The server runs a fresh SDK <code className="font-mono">query()</code>{" "}
          per user message. When a subagent is active, its parsed definition is
          passed via{" "}
          <code className="font-mono">{`options.agent + options.agents`}</code>;
          the SDK does <span className="text-[#d97757]">not</span>{" "}
          auto-discover <code className="font-mono">.claude/agents/</code>, so
          the server reads + registers them per turn.
        </p>
      </Section>

      <Section label="Active session (frontend state)">
        <KeyValue
          label="Session ID"
          value={activeSessionId || "(none — new chat)"}
          mono
        />
        <KeyValue label="Messages" value={String(messageCount)} />
        <KeyValue
          label="Active agent"
          value={activeAgentName || "(default)"}
          mono
        />
      </Section>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 font-['Poppins',_Arial,_sans-serif] text-[10px] font-semibold uppercase tracking-widest text-[#b0aea5]">
        {label}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1 text-[12px]">
      <span className="w-40 shrink-0 text-[11px] text-[#b0aea5]">{label}</span>
      <span
        className={`min-w-0 flex-1 break-all text-[#141413] ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#e8e6dc] bg-[#faf9f5]/50 px-4 py-6 text-center text-[12px] text-[#b0aea5]">
      {children}
    </div>
  );
}
