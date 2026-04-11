import { useEffect, useState } from "react";
import { useStore, type FileEntry } from "../store";
import * as api from "../api";

// ═══════════════════════════════════════════════════════════════
//  CustomizePanel — replaces chat/preview when user is configuring
//  skills / dispatch / connectors. Lives in the main area so
//  config surfaces get real estate.
// ═══════════════════════════════════════════════════════════════

export type CustomizeSub = "skills" | "dispatch" | "connectors";

interface Props {
  sub: CustomizeSub;
  onClose: () => void;
  onOpenFile: (path: string, name: string) => void;
  onOpenDispatch: () => void;
}

export default function CustomizePanel({
  sub,
  onClose,
  onOpenFile,
  onOpenDispatch,
}: Props) {
  const { files } = useStore();

  // Pull skills out of the hoisted file tree the same way Sidebar does
  const skillsFolder = files.find(
    (f) => f.name === "skills" && f.type === "directory",
  );
  const skillsList = (skillsFolder?.children || []).filter(
    (f) => f.type === "directory",
  );

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
              {sub === "skills" && "Skills"}
              {sub === "dispatch" && "Dispatch"}
              {sub === "connectors" && "Connectors"}
            </h2>
          </div>
          <p className="mt-2 pl-9 text-[12px] leading-relaxed text-[#b0aea5]">
            {sub === "skills" &&
              "Reusable capabilities the agent can invoke inside a project."}
            {sub === "dispatch" &&
              "Inbound adapters — where the agent receives messages from."}
            {sub === "connectors" &&
              "Outbound integrations — services the agent can reach out to."}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-6">
          {sub === "skills" && (
            <SkillsTable skills={skillsList} onOpenFile={onOpenFile} />
          )}
          {sub === "dispatch" && <DispatchTable onOpenDispatch={onOpenDispatch} />}
          {sub === "connectors" && <ConnectorsTable />}
        </div>
      </div>
    </div>
  );
}

// ── Skills sub ───────────────────────────────────────────────

function SkillsTable({
  skills,
  onOpenFile,
}: {
  skills: FileEntry[];
  onOpenFile: (path: string, name: string) => void;
}) {
  if (skills.length === 0) {
    return (
      <div className="py-12 text-center text-[13px] text-[#b0aea5]">
        No skills in this project yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#f0efe9] rounded-xl border border-[#e8e6dc] bg-white">
      {skills.map((skill) => {
        const skillMd = skill.children?.find((c) => c.name === "SKILL.md");
        return (
          <button
            key={skill.path}
            onClick={() => {
              if (skillMd) onOpenFile(skillMd.path, skillMd.name);
            }}
            className="group flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-[#faf9f5]"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#d97757]/10 text-[#d97757]">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-[#141413]">{skill.name}</div>
              <div className="mt-0.5 text-[11px] text-[#b0aea5]">
                {skill.children?.length ?? 0} files · click to open SKILL.md
              </div>
            </div>
            <svg
              className="mt-1 h-3.5 w-3.5 shrink-0 text-[#b0aea5] opacity-0 transition group-hover:opacity-100"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        );
      })}
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
