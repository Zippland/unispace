import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchAgent,
  updateAgent,
  createApiKey,
  revokeApiKey,
  type AgentConfig,
  type ApiKey,
  type SkillDef,
  type DispatchConfig,
  type CommandDef,
  type DefaultFile,
} from "../utils/adminApi";

type Tab = "persona" | "capabilities" | "workspace" | "publish" | "playground" | "users";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("persona");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchAgent(id)
      .then(setAgent)
      .catch(() => navigate("/admin/agents"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(refresh, [refresh]);

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    try {
      const updated = await updateAgent(agent.id, agent);
      setAgent(updated);
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function handleCreateKey() {
    if (!agent || !newKeyName.trim()) return;
    try {
      const result = await createApiKey(agent.id, newKeyName.trim());
      setNewKeyValue(result.key);
      setNewKeyName("");
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!agent) return;
    await revokeApiKey(agent.id, keyId);
    refresh();
  }

  if (loading || !agent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#b0aea5]">
        Loading...
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "persona", label: "Persona" },
    {
      key: "capabilities",
      label: "Capabilities",
      count: agent.skills.length + agent.commands.length + agent.environment.mcp_servers.length,
    },
    {
      key: "workspace",
      label: "Workspace",
      count: agent.default_files.length,
    },
    { key: "publish", label: "Publish" },
    { key: "playground", label: "Playground" },
    { key: "users", label: "Users" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <button
          onClick={() => navigate("/admin/agents")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b0aea5] transition hover:bg-white hover:text-[#141413]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141413]">
          <svg className="h-4 w-4 text-[#faf9f5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-[#141413]">
              {agent.name}
            </h1>
          </div>
          <p className="text-[10px] font-mono text-[#b0aea5]">{agent.id}</p>
        </div>
        <button
          onClick={() => navigate(`/admin/traces?search=${encodeURIComponent(agent.name)}`)}
          className="rounded-lg border border-[#e8e6dc] px-3 py-2 text-xs text-[#6b6963] transition hover:bg-white hover:text-[#141413]"
        >
          View Traces
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#141413] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a28] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[#e8e6dc] bg-white px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-1.5 py-3 text-sm font-medium transition ${
              activeTab === t.key ? "text-[#141413]" : "text-[#b0aea5] hover:text-[#6b6963]"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-[#141413]/[0.06] px-1.5 py-0.5 text-[10px] text-[#6b6963]">
                {t.count}
              </span>
            )}
            {activeTab === t.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#d97757]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "playground" ? (
        <PlaygroundTab agent={agent} />
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-2xl">
            {activeTab === "persona" && <PersonaTab agent={agent} onChange={setAgent} />}
            {activeTab === "capabilities" && <CapabilitiesTab agent={agent} onChange={setAgent} />}
            {activeTab === "workspace" && <WorkspaceTab agent={agent} onChange={setAgent} />}
            {activeTab === "publish" && (
              <PublishTab
                agent={agent} onChange={setAgent}
                newKeyName={newKeyName} onNewKeyNameChange={setNewKeyName}
                newKeyValue={newKeyValue} onCreateKey={handleCreateKey}
                onDismissKey={() => setNewKeyValue(null)} onRevokeKey={handleRevokeKey}
              />
            )}
            {activeTab === "users" && <UsersTab />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Persona tab ─────────────────────────────────────────────

function PersonaTab({ agent, onChange }: { agent: AgentConfig; onChange: (a: AgentConfig) => void }) {
  const set = (field: keyof AgentConfig, value: any) => onChange({ ...agent, [field]: value });

  return (
    <div className="space-y-5">
      <Field label="Name">
        <input type="text" value={agent.name} onChange={(e) => set("name", e.target.value)} className={INPUT} />
      </Field>
      <Field label="Description">
        <input type="text" value={agent.description} onChange={(e) => set("description", e.target.value)} className={INPUT} />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Model">
          <select value={agent.model} onChange={(e) => set("model", e.target.value)} className={INPUT}>
            <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
            <option value="claude-opus-4-6">Claude Opus 4.6</option>
            <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            <option value="doubao-pro">Doubao Pro</option>
            <option value="doubao-lite">Doubao Lite</option>
          </select>
        </Field>
        <Field label="BU">
          <select value={agent.bu} onChange={(e) => set("bu", e.target.value)} className={INPUT}>
            <option value="">Select BU</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
            <option value="engineering">Engineering</option>
            <option value="marketing">Marketing</option>
            <option value="legal">Legal</option>
            <option value="design">Design</option>
          </select>
        </Field>
        <Field label="Author">
          <input type="text" value={agent.author} onChange={(e) => set("author", e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="System Prompt (CLAUDE.md equivalent)">
        <textarea value={agent.system_prompt} onChange={(e) => set("system_prompt", e.target.value)}
          rows={14} className={INPUT + " font-mono resize-none"}
          placeholder="# Agent Name\n\nDefine who this agent is, what it knows, and how it should behave.\n\nThis becomes the CLAUDE.md in every user's workspace." />
      </Field>
    </div>
  );
}

// ── Capabilities tab ────────────────────────────────────────

function CapabilitiesTab({ agent, onChange }: { agent: AgentConfig; onChange: (a: AgentConfig) => void }) {
  return (
    <div className="space-y-8">
      {/* Skills */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>Skills</SectionTitle>
            <p className="mt-0.5 text-xs text-[#6b6963]">
              Installed into <code className="text-[10px]">.claude/skills/</code> in every user workspace.
            </p>
          </div>
          <button onClick={() => onChange({
            ...agent,
            skills: [...agent.skills, { name: "", description: "", archive_url: "", enabled: true }],
          })} className="text-xs text-[#d97757] hover:underline">+ Add skill</button>
        </div>
        <div className="mt-3 space-y-3">
          {agent.skills.map((skill, i) => (
            <SkillEditor
              key={i} skill={skill}
              onChange={(s) => { const arr = [...agent.skills]; arr[i] = s; onChange({ ...agent, skills: arr }); }}
              onDelete={() => onChange({ ...agent, skills: agent.skills.filter((_, j) => j !== i) })}
            />
          ))}
          {agent.skills.length === 0 && <Empty>No skills configured</Empty>}
        </div>
      </section>

      {/* Commands */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>Slash Commands</SectionTitle>
            <p className="mt-0.5 text-xs text-[#6b6963]">
              Installed into <code className="text-[10px]">.claude/commands/</code>. Users type <code className="text-[10px]">/name</code> in chat.
            </p>
          </div>
          <button onClick={() => onChange({
            ...agent,
            commands: [...agent.commands, { name: "", description: "", body: "" }],
          })} className="text-xs text-[#d97757] hover:underline">+ Add command</button>
        </div>
        <div className="mt-3 space-y-3">
          {agent.commands.map((cmd, i) => (
            <CommandEditor
              key={i} command={cmd}
              onChange={(c) => { const arr = [...agent.commands]; arr[i] = c; onChange({ ...agent, commands: arr }); }}
              onDelete={() => onChange({ ...agent, commands: agent.commands.filter((_, j) => j !== i) })}
            />
          ))}
          {agent.commands.length === 0 && <Empty>No commands configured</Empty>}
        </div>
      </section>

      {/* MCP Servers */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>MCP Servers</SectionTitle>
            <p className="mt-0.5 text-xs text-[#6b6963]">
              Model Context Protocol servers providing external tool access (GitHub, Slack, databases, etc).
            </p>
          </div>
          <button onClick={() => {
            const env = agent.environment;
            onChange({ ...agent, environment: { ...env, mcp_servers: [...env.mcp_servers, { name: "", command: "", args: [], enabled: true }] } });
          }} className="text-xs text-[#d97757] hover:underline">+ Add MCP server</button>
        </div>
        <div className="mt-3 space-y-3">
          {agent.environment.mcp_servers.map((mcp, i) => (
            <McpEditor
              key={i} mcp={mcp}
              onChange={(m) => {
                const servers = [...agent.environment.mcp_servers];
                servers[i] = m;
                onChange({ ...agent, environment: { ...agent.environment, mcp_servers: servers } });
              }}
              onDelete={() => onChange({
                ...agent,
                environment: { ...agent.environment, mcp_servers: agent.environment.mcp_servers.filter((_, j) => j !== i) },
              })}
            />
          ))}
          {agent.environment.mcp_servers.length === 0 && <Empty>No MCP servers configured</Empty>}
        </div>
      </section>
    </div>
  );
}

function McpEditor({ mcp, onChange, onDelete }: {
  mcp: { name: string; command: string; args: string[]; enabled: boolean };
  onChange: (m: typeof mcp) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!mcp.name);
  return (
    <div className="rounded-xl border border-[#e8e6dc] bg-white">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-[10px] text-[#b0aea5]">{open ? "\u25BC" : "\u25B6"}</span>
        <span className="inline-block h-2 w-2 rounded-full bg-[#788c5d]" />
        <span className="flex-1 truncate text-sm font-medium text-[#141413]">{mcp.name || "New MCP server"}</span>
        <label className="flex items-center gap-1 text-[10px] text-[#6b6963]" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={mcp.enabled} onChange={(e) => onChange({ ...mcp, enabled: e.target.checked })} className="accent-[#d97757]" />
          Enabled
        </label>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[#b0aea5] hover:text-red-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-[#e8e6dc] px-4 py-3">
          <Field label="Name">
            <input type="text" value={mcp.name} onChange={(e) => onChange({ ...mcp, name: e.target.value })} className={INPUT_SM} placeholder="github" />
          </Field>
          <Field label="Command">
            <input type="text" value={mcp.command} onChange={(e) => onChange({ ...mcp, command: e.target.value })}
              className={INPUT_SM + " font-mono"} placeholder="npx -y @modelcontextprotocol/server-github" />
          </Field>
          <Field label="Arguments (one per line)">
            <textarea value={mcp.args.join("\n")} onChange={(e) => onChange({ ...mcp, args: e.target.value.split("\n").filter(Boolean) })}
              rows={2} className={INPUT_SM + " font-mono resize-none"} placeholder="--token\nghp_xxxxx" />
          </Field>
        </div>
      )}
    </div>
  );
}

function SkillEditor({ skill, onChange, onDelete }: { skill: SkillDef; onChange: (s: SkillDef) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!skill.name);
  return (
    <div className="rounded-xl border border-[#e8e6dc] bg-white">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-[10px] text-[#b0aea5]">{open ? "▼" : "▶"}</span>
        <span className="inline-block h-2 w-2 rounded-full bg-[#d97757]" />
        <span className="flex-1 truncate text-sm font-medium text-[#141413]">{skill.name || "New skill"}</span>
        <label className="flex items-center gap-1 text-[10px] text-[#6b6963]" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={skill.enabled} onChange={(e) => onChange({ ...skill, enabled: e.target.checked })} className="accent-[#d97757]" />
          Enabled
        </label>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[#b0aea5] hover:text-red-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-[#e8e6dc] px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (slug)">
              <input type="text" value={skill.name} onChange={(e) => onChange({ ...skill, name: e.target.value })} className={INPUT_SM} placeholder="data-analysis" />
            </Field>
            <Field label="Description">
              <input type="text" value={skill.description} onChange={(e) => onChange({ ...skill, description: e.target.value })} className={INPUT_SM} placeholder="Short description" />
            </Field>
          </div>
          <Field label="SKILL.md Content">
            <textarea value={skill.content} onChange={(e) => onChange({ ...skill, content: e.target.value })}
              rows={6} className={INPUT_SM + " font-mono resize-none"} placeholder="# Skill Name\n\nDescribe how to use this skill..." />
          </Field>
        </div>
      )}
    </div>
  );
}

function CommandEditor({ command, onChange, onDelete }: { command: CommandDef; onChange: (c: CommandDef) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!command.name);
  return (
    <div className="rounded-xl border border-[#e8e6dc] bg-white">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-[10px] text-[#b0aea5]">{open ? "▼" : "▶"}</span>
        <span className="text-sm font-mono text-[#d97757]">/</span>
        <span className="flex-1 truncate text-sm font-medium text-[#141413]">{command.name || "new-command"}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[#b0aea5] hover:text-red-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-[#e8e6dc] px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Command name (no /)">
              <input type="text" value={command.name} onChange={(e) => onChange({ ...command, name: e.target.value })} className={INPUT_SM} placeholder="review" />
            </Field>
            <Field label="Description">
              <input type="text" value={command.description} onChange={(e) => onChange({ ...command, description: e.target.value })} className={INPUT_SM} placeholder="Run code review" />
            </Field>
          </div>
          <Field label="Body (use $ARGUMENTS for user input)">
            <textarea value={command.body} onChange={(e) => onChange({ ...command, body: e.target.value })}
              rows={4} className={INPUT_SM + " font-mono resize-none"} placeholder="Review the following code for bugs and quality issues:\n\n$ARGUMENTS" />
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Workspace tab (files only — no sandbox/environment settings per R9) ──

function WorkspaceTab({ agent, onChange }: { agent: AgentConfig; onChange: (a: AgentConfig) => void }) {

  return (
    <div className="space-y-8">
      {/* Default files */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>Default Files</SectionTitle>
            <p className="mt-0.5 text-xs text-[#6b6963]">Pre-loaded into each user's workspace.</p>
          </div>
          <button onClick={() => onChange({ ...agent, default_files: [...agent.default_files, { path: "", content: "" }] })}
            className="text-xs text-[#d97757] hover:underline">+ Add file</button>
        </div>
        <div className="mt-3 space-y-3">
          {agent.default_files.map((f, i) => (
            <div key={i} className="rounded-xl border border-[#e8e6dc] bg-white p-4">
              <div className="flex items-center gap-2">
                <Field label="Path">
                  <input type="text" value={f.path}
                    onChange={(e) => { const arr = [...agent.default_files]; arr[i] = { ...f, path: e.target.value }; onChange({ ...agent, default_files: arr }); }}
                    className={INPUT_SM + " font-mono"} placeholder="data/config.json" />
                </Field>
                <button onClick={() => onChange({ ...agent, default_files: agent.default_files.filter((_, j) => j !== i) })}
                  className="mt-5 text-[#b0aea5] hover:text-red-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-2">
                <textarea value={f.content}
                  onChange={(e) => { const arr = [...agent.default_files]; arr[i] = { ...f, content: e.target.value }; onChange({ ...agent, default_files: arr }); }}
                  rows={4} className={INPUT_SM + " font-mono resize-none"} placeholder="File content..." />
              </div>
            </div>
          ))}
          {agent.default_files.length === 0 && <Empty>No default files</Empty>}
        </div>
      </section>

    </div>
  );
}

// ── Publish tab (Gallery + Response API) ────────────────────

function PublishTab({ agent, onChange, newKeyName, onNewKeyNameChange, newKeyValue, onCreateKey, onDismissKey, onRevokeKey }: {
  agent: AgentConfig; onChange: (a: AgentConfig) => void;
  newKeyName: string; onNewKeyNameChange: (s: string) => void;
  newKeyValue: string | null; onCreateKey: () => void; onDismissKey: () => void; onRevokeKey: (id: string) => void;
}) {
  const api = agent.api;
  const setApi = (patch: Partial<typeof api>) => onChange({ ...agent, api: { ...api, ...patch } });
  const activeKeys = api.keys.filter((k) => !k.revoked);
  const revokedKeys = api.keys.filter((k) => k.revoked);

  return (
    <div className="space-y-6">

      <p className="text-xs text-[#6b6963]">
        Three distribution channels. Enable any combination.
      </p>

      <div>
      {/* Gallery */}
      <div className="flex items-center justify-between rounded-xl border border-[#e8e6dc] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#788c5d]/10">
            <svg className="h-4 w-4 text-[#788c5d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#141413]">Mira Gallery</h3>
            <p className="mt-0.5 text-xs text-[#6b6963]">Users browse and self-deploy from the template gallery.</p>
          </div>
        </div>
        <button onClick={() => onChange({ ...agent, published: !agent.published })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${agent.published ? "bg-[#d97757]" : "bg-[#e8e6dc]"}`}>
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${agent.published ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
        </button>
      </div>

      {/* Response API */}
      <div className="flex items-center justify-between rounded-xl border border-[#e8e6dc] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6a9bcc]/10">
            <svg className="h-4 w-4 text-[#6a9bcc]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#141413]">Response API</h3>
            <p className="mt-0.5 text-xs text-[#6b6963]">External systems call this agent via HTTP endpoint.</p>
          </div>
        </div>
        <button onClick={() => setApi({ enabled: !api.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${api.enabled ? "bg-[#d97757]" : "bg-[#e8e6dc]"}`}>
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${api.enabled ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
        </button>
      </div>

      {api.enabled && (
        <>
          {/* Endpoint */}
          <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
            <SectionTitle>Endpoint</SectionTitle>
            <div className="mt-2 rounded-lg bg-[#141413] px-4 py-3">
              <code className="text-xs text-green-400">POST /api/v1/chat</code>
              <pre className="mt-2 text-[10px] text-white/60">{`curl -X POST /api/v1/chat \\
  -H "Authorization: Bearer mira_..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "hello"}'`}</pre>
            </div>
          </div>

          {/* Rate limit */}
          <div className="flex items-center gap-3 rounded-xl border border-[#e8e6dc] bg-white p-5">
            <SectionTitle>Rate Limit</SectionTitle>
            <input type="number" value={api.rate_limit} onChange={(e) => setApi({ rate_limit: parseInt(e.target.value) || 0 })}
              className="w-20 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-1.5 text-sm text-[#141413] outline-none" />
            <span className="text-xs text-[#6b6963]">req/min (0 = no limit)</span>
          </div>

          {/* Usage */}
          <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
            <SectionTitle>Usage</SectionTitle>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <Stat label="Requests" value={api.usage.total_requests.toLocaleString()} />
              <Stat label="Tokens" value={api.usage.total_tokens.toLocaleString()} />
              <Stat label="Since" value={new Date(api.usage.last_reset).toLocaleDateString("zh-CN")} />
            </div>
          </div>

          {/* Keys */}
          <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
            <SectionTitle>API Keys</SectionTitle>
            {newKeyValue && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-700">Copy now — won't be shown again</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-1.5 text-xs font-mono text-[#141413] select-all">{newKeyValue}</code>
                  <button onClick={() => navigator.clipboard.writeText(newKeyValue)}
                    className="rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-xs text-[#6b6963] hover:bg-[#faf9f5]">Copy</button>
                  <button onClick={onDismissKey} className="text-xs text-[#b0aea5] hover:text-[#141413]">Dismiss</button>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <input type="text" value={newKeyName} onChange={(e) => onNewKeyNameChange(e.target.value)}
                placeholder="Key name" className={INPUT_SM + " flex-1"} onKeyDown={(e) => e.key === "Enter" && onCreateKey()} />
              <button onClick={onCreateKey} disabled={!newKeyName.trim()}
                className="rounded-lg bg-[#141413] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2a2a28] disabled:opacity-50">Generate</button>
            </div>
            {activeKeys.length > 0 && (
              <div className="mt-3 space-y-2">
                {activeKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2">
                    <code className="text-xs font-mono text-[#141413]">{k.prefix}...</code>
                    <span className="text-xs text-[#6b6963]">{k.name}</span>
                    <span className="flex-1" />
                    {k.last_used_at && <span className="text-[10px] text-[#b0aea5]">Used {new Date(k.last_used_at).toLocaleDateString("zh-CN")}</span>}
                    <button onClick={() => onRevokeKey(k.id)}
                      className="rounded border border-[#e8e6dc] px-2 py-0.5 text-[10px] text-[#b0aea5] hover:border-red-200 hover:text-red-500">Revoke</button>
                  </div>
                ))}
              </div>
            )}
            {revokedKeys.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-[#b0aea5]">Revoked</p>
                {revokedKeys.map((k) => (
                  <div key={k.id} className="px-3 py-1 text-xs text-[#b0aea5] line-through">{k.prefix}... — {k.name}</div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Dispatch (Feishu) */}
      <DispatchSection agent={agent} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Dispatch section ────────────────────────────────────────

const DEFAULT_DISPATCH: DispatchConfig = {
  enabled: false,
  platform: "feishu",
  app_id: "",
  app_secret: "",
  bot_name: "",
  welcome_message: "",
};

function DispatchSection({ agent, onChange }: { agent: AgentConfig; onChange: (a: AgentConfig) => void }) {
  const dispatch = agent.dispatch || { ...DEFAULT_DISPATCH };
  const setDispatch = (patch: Partial<DispatchConfig>) => {
    onChange({ ...agent, dispatch: { ...dispatch, ...patch } });
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-[#e8e6dc] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d97757]/10">
            <svg className="h-4 w-4 text-[#d97757]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#141413]">Dispatch (Feishu)</h3>
            <p className="mt-0.5 text-xs text-[#6b6963]">Users interact via Feishu bot messages.</p>
          </div>
        </div>
        <button onClick={() => setDispatch({ enabled: !dispatch.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${dispatch.enabled ? "bg-[#d97757]" : "bg-[#e8e6dc]"}`}>
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${dispatch.enabled ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
        </button>
      </div>

      {dispatch.enabled && (
        <div className="rounded-xl border border-[#e8e6dc] bg-white p-5 space-y-4">
          <SectionTitle>Feishu Bot Configuration</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="App ID">
              <input type="text" value={dispatch.app_id} onChange={(e) => setDispatch({ app_id: e.target.value })}
                className={INPUT_SM + " font-mono"} placeholder="cli_xxxxxxxxxx" />
            </Field>
            <Field label="App Secret">
              <input type="password" value={dispatch.app_secret} onChange={(e) => setDispatch({ app_secret: e.target.value })}
                className={INPUT_SM + " font-mono"} placeholder="xxxxxxxxxxxxxxxx" />
            </Field>
          </div>
          <Field label="Bot Name">
            <input type="text" value={dispatch.bot_name} onChange={(e) => setDispatch({ bot_name: e.target.value })}
              className={INPUT_SM} placeholder="Finance Assistant" />
          </Field>
          <Field label="Welcome Message">
            <textarea value={dispatch.welcome_message} onChange={(e) => setDispatch({ welcome_message: e.target.value })}
              rows={3} className={INPUT_SM + " resize-none"}
              placeholder="Hi! I'm your finance assistant. Ask me anything about reports, analysis, or forecasting." />
          </Field>
        </div>
      )}
    </>
  );
}

// ── Playground tab ─────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
}

function PlaygroundTab({ agent }: { agent: AgentConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "", toolCalls: [] };
    setMessages((prev) => [...prev, assistantMsg]);
    const msgIndex = messages.length + 1; // index of the assistant message

    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        setMessages((prev) => {
          const arr = [...prev];
          arr[msgIndex] = { ...arr[msgIndex], content: `Error: ${res.status} ${res.statusText}` };
          return arr;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setStreaming(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === "text_delta") {
              setMessages((prev) => {
                const arr = [...prev];
                const msg = arr[msgIndex];
                arr[msgIndex] = { ...msg, content: msg.content + (evt.content || "") };
                return arr;
              });
            } else if (evt.type === "tool_call") {
              setMessages((prev) => {
                const arr = [...prev];
                const msg = arr[msgIndex];
                arr[msgIndex] = { ...msg, toolCalls: [...(msg.toolCalls || []), evt.name || "tool"] };
                return arr;
              });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const arr = [...prev];
        arr[msgIndex] = { ...arr[msgIndex], content: `Connection error: ${err.message}` };
        return arr;
      });
    }
    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-16 text-[#b0aea5]">
              <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <p className="text-sm">Test {agent.name}</p>
              <p className="mt-1 text-xs">Send a message to start a conversation.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-[#e8e6dc] text-[#141413]"
                    : "border border-[#e8e6dc] bg-white text-[#141413]"
                }`}
              >
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {msg.toolCalls.map((tc, j) => (
                      <div key={j} className="flex items-center gap-1.5 rounded-md bg-[#6a9bcc]/10 px-2 py-1 text-[10px] text-[#6a9bcc]">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.653-4.657m0 0a2.678 2.678 0 0 1 3.586 0l1.006-1.006m-4.592 1.006 4.592-1.006" />
                        </svg>
                        {tc}
                      </div>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-[#d97757] rounded-sm" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#e8e6dc] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#e8e6dc] bg-[#faf9f5] px-4 py-2.5 text-sm text-[#141413] outline-none transition focus:border-[#141413]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141413] text-white transition hover:bg-[#2a2a28] disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Users tab ──────────────────────────────────────────────

const MOCK_USERS = [
  { name: "Zhang Wei", department: "Engineering", lastActive: "2 hours ago", sessions: 47, tokens: 128400 },
  { name: "Li Na", department: "Finance", lastActive: "4 hours ago", sessions: 35, tokens: 96200 },
  { name: "Wang Fang", department: "Marketing", lastActive: "1 hour ago", sessions: 29, tokens: 81500 },
  { name: "Chen Ming", department: "Product", lastActive: "30 minutes ago", sessions: 52, tokens: 145800 },
  { name: "Liu Yang", department: "Data Science", lastActive: "6 hours ago", sessions: 18, tokens: 54300 },
  { name: "Zhao Jing", department: "HR", lastActive: "1 day ago", sessions: 12, tokens: 33100 },
  { name: "Huang Lei", department: "Engineering", lastActive: "3 hours ago", sessions: 41, tokens: 112700 },
  { name: "Zhou Ting", department: "Operations", lastActive: "5 hours ago", sessions: 23, tokens: 67900 },
  { name: "Wu Hao", department: "Finance", lastActive: "8 hours ago", sessions: 16, tokens: 44200 },
  { name: "Xu Lin", department: "Engineering", lastActive: "20 minutes ago", sessions: 63, tokens: 178500 },
];

function UsersTab() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase()),
  );
  const activeCount = MOCK_USERS.filter((u) => !u.lastActive.includes("day")).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6b6963]">
          <span className="font-semibold text-[#141413]">{activeCount}</span> active users in the last 7 days
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-56 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-1.5 text-xs text-[#141413] outline-none transition focus:border-[#141413]"
        />
      </div>

      <div className="rounded-xl border border-[#e8e6dc] bg-white overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#e8e6dc] bg-[#faf9f5]">
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-[#b0aea5]">User</th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-[#b0aea5]">Department</th>
              <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-[#b0aea5]">Last Active</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#b0aea5]">Sessions</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#b0aea5]">Tokens Used</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => (
              <tr key={i} className="border-b border-[#e8e6dc]/50 transition hover:bg-[#faf9f5]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8e6dc] text-[10px] font-semibold text-[#6b6963]">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <span className="font-medium text-[#141413]">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6b6963]">{user.department}</td>
                <td className="px-4 py-3 text-[#6b6963]">{user.lastActive}</td>
                <td className="px-4 py-3 text-right text-[#141413]">{user.sessions}</td>
                <td className="px-4 py-3 text-right text-[#141413]">{user.tokens.toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#b0aea5]">
                  No users match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Status actions ──────────────────────────────────────────

// ── Primitives ──────────────────────────────────────────────

const INPUT = "mt-1 w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2 text-sm text-[#141413] outline-none transition focus:border-[#141413]";
const INPUT_SM = "w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-2.5 py-1.5 text-xs text-[#141413] outline-none transition focus:border-[#141413]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-[#6b6963]">{children}</label>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[#141413]">{children}</h3>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">{label}</p><p className="mt-0.5 text-lg font-semibold text-[#141413]">{value}</p></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-xs text-[#b0aea5]">{children}</p>;
}
function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[#b0aea5] hover:text-red-500">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
    </button>
  );
}
