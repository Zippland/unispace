import { useState, useEffect, useRef, useMemo, memo, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type MessagePart, type ChatMessage, type FileEntry } from "../store";
import * as api from "../api";

// ═══════════════════════════════════════════════════════════════
//  SVG Icons (ported from finance_agent)
// ═══════════════════════════════════════════════════════════════

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
  );
}

function ToolIcon({ name, className }: { name: string; className?: string }) {
  if (["read_file", "write_file", "edit_file", "list_dir"].includes(name)) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (name === "bash" || name === "search" || name === "find_files") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }
  if (name.startsWith("task_")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ThinkingBlock (sparkle animation)
// ═══════════════════════════════════════════════════════════════

const THINKING_COLLAPSE_THRESHOLD = 200;

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!content && !isStreaming) return null;

  const isLong = (content?.length || 0) > THINKING_COLLAPSE_THRESHOLD;
  const shouldTruncate = isLong && !expanded;

  return (
    <div className="relative pl-8 pb-1">
      <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center text-[#9f9c93]">
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            className={isStreaming ? "origin-[9px_12px] animate-[sparkle-lg_2s_ease-in-out_infinite]" : ""} />
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
            className={isStreaming ? "origin-[18px_6px] animate-[sparkle-md_2s_ease-in-out_0.4s_infinite]" : ""} />
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            className={isStreaming ? "origin-[16.5px_18.75px] animate-[sparkle-sm_2s_ease-in-out_0.8s_infinite]" : ""} />
        </svg>
      </div>
      <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[rgba(41,41,31,0.1)]" />
      <div>
        <div
          className={`relative text-[13px] leading-relaxed text-[#9f9c93] ${
            shouldTruncate ? "max-h-[7.5rem] overflow-hidden" : ""
          }`}
        >
          <pre className="whitespace-pre-wrap font-[inherit]">{content || "Thinking..."}</pre>
          {shouldTruncate && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#fafaf7] to-transparent" />
          )}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[13px] text-[#9f9c93] transition hover:text-[#29291f]"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ToolCallStep (timeline style)
// ═══════════════════════════════════════════════════════════════

function ToolCallStep({ part }: { part: MessagePart }) {
  const [expanded, setExpanded] = useState(false);
  const loading = part.output === undefined;
  const isError = part.isError;
  const hasInput = !!(part.input && Object.keys(part.input).length > 0);
  const hasDetail = hasInput || part.output !== undefined;

  return (
    <>
      {/* Tool call (use) */}
      <div className="relative pl-8 pb-1">
        <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center text-[#9f9c93]">
          <ToolIcon name={part.name || ""} className={`h-[18px] w-[18px] ${loading ? "animate-pulse text-[#29291f]" : ""}`} />
        </div>
        <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[rgba(41,41,31,0.1)]" />
        <button
          onClick={() => hasDetail && setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[13px] text-[#9f9c93] transition hover:text-[#29291f]"
        >
          <span>{loading ? `${part.name}...` : part.name}</span>
          {hasDetail && !loading && (
            <ChevronDown className={`h-3 w-3 text-[#9f9c93]/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
          )}
        </button>
        {expanded && (
          <div className="mt-2 space-y-2 text-xs text-[#9f9c93]">
            {hasInput && (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[#29291f]/[0.03] p-3 font-mono">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
      {/* Tool result */}
      {part.output !== undefined && (
        <div className="relative pl-8 pb-1">
          <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center">
            {isError ? (
              <svg className="h-[18px] w-[18px] text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            ) : (
              <svg className="h-[18px] w-[18px] text-[#788c5d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
          </div>
          <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[rgba(41,41,31,0.1)]" />
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1.5 text-[13px] transition hover:text-[#29291f] ${isError ? "text-[#d97757]" : "text-[#9f9c93]"}`}
          >
            <span>{isError ? `${part.name} failed` : `${part.name} done`}</span>
            <ChevronDown className={`h-3 w-3 text-[#9f9c93]/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <pre className={`mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#29291f]/[0.03] p-3 font-mono text-xs ${isError ? "text-[#d97757]" : "text-[#9f9c93]"}`}>
              {part.output}
            </pre>
          )}
        </div>
      )}
    </>
  );
}

function DoneStep() {
  return (
    <div className="relative pl-8 pb-2">
      <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center text-[#788c5d]">
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <span className="text-[13px] text-[#9f9c93]">Done</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Collapsible process segment
// ═══════════════════════════════════════════════════════════════

function isProcessPart(p: MessagePart): boolean {
  return p.type === "thinking" || p.type === "tool_call";
}

function processSummary(parts: MessagePart[]): string {
  const thinking = parts.find((p) => p.type === "thinking");
  if (thinking?.content) {
    const first = thinking.content.trim().split("\n")[0].slice(0, 20);
    return first.length >= 20 ? first + "..." : first;
  }
  const tools = parts.filter((p) => p.type === "tool_call").map((p) => p.name);
  if (tools.length) return `Called ${tools.join(", ")}`;
  return "Processing...";
}

function CollapsibleProcess({
  parts,
  showDone,
  streaming,
}: {
  parts: MessagePart[];
  showDone: boolean;
  streaming: boolean;
}) {
  // Start expanded while the turn is live, collapsed after it ends.
  const [collapsed, setCollapsed] = useState(!streaming);

  // When a live turn finishes, collapse automatically. Allow the user to
  // still toggle manually after that.
  const wasStreaming = useRef(streaming);
  useEffect(() => {
    if (wasStreaming.current && !streaming) {
      setCollapsed(true);
    }
    wasStreaming.current = streaming;
  }, [streaming]);

  return (
    <div className="mb-1">
      <button onClick={() => setCollapsed(!collapsed)}
        className="mb-1 flex items-center gap-1.5 text-[13px] text-[#9f9c93] transition hover:text-[#29291f]">
        <span className="flex-1 truncate text-left">{processSummary(parts)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>
      {!collapsed && (
        <>
          {parts.map((p, i) =>
            p.type === "thinking" ? (
              <ThinkingBlock key={i} content={p.content || ""} />
            ) : p.type === "tool_call" ? (
              <ToolCallStep key={i} part={p} />
            ) : null,
          )}
          {showDone && <DoneStep />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Empty State — project welcome hero (no gallery; gallery lives
//  in CATWORK mode only).
// ═══════════════════════════════════════════════════════════════

function EmptyState({
  inputBarSlot,
}: {
  inputBarSlot?: ReactNode;
}) {
  const {
    serverUrl, currentProject, sessions, messages: storeMessages,
    setActiveSession, setActiveTab: setStoreActiveTab, setSessionMessages,
  } = useStore();
  const [tab, setTab] = useState<"recents" | "task">("recents");

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.createdAt - a.createdAt),
    [sessions],
  );

  async function openSession(id: string) {
    setActiveSession(id);
    setStoreActiveTab(null);
    if (!storeMessages[id] || storeMessages[id].length === 0) {
      try {
        const msgs = await api.fetchSessionMessages(serverUrl, id);
        if (Array.isArray(msgs) && msgs.length > 0) {
          setSessionMessages(id, msgs);
        }
      } catch {}
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-8 py-10">
        {/* Input bar — real, from ChatPanel */}
        {inputBarSlot && <div className="mb-8">{inputBarSlot}</div>}

        {/* Recents | Task tabs */}
        <div className="flex items-center gap-5 border-b border-[rgba(41,41,31,0.1)]">
          {(["recents", "task"] as const).map((t) => {
            const label = t === "recents" ? "Recents" : "Task";
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative pb-3 text-[14px] transition ${
                  active ? "font-medium text-[#29291f]" : "font-light text-[#6a685d]"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-[#333329]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="mt-4">
          {tab === "recents" ? (
            sorted.length === 0 ? (
              <p className="py-10 text-center text-[14px] font-light text-[#9f9c93]">
                No chats yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {sorted.map((s) => {
                  const d = new Date(s.createdAt);
                  return (
                    <button
                      key={s.id}
                      onClick={() => openSession(s.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[rgba(41,41,31,0.06)]"
                    >
                      <span className="flex-1 truncate text-[14px] font-medium text-[#29291f]">
                        {s.title || s.id}
                      </span>
                      <span className="shrink-0 text-[12px] text-[#9f9c93]">
                        {d.toLocaleDateString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <p className="py-10 text-center text-[14px] font-light text-[#9f9c93]">
              No tasks yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MessageBubble
// ═══════════════════════════════════════════════════════════════

type Segment = { kind: "process"; parts: MessagePart[] } | { kind: "content"; part: MessagePart };

function segmentParts(parts: MessagePart[]): Segment[] {
  const segs: Segment[] = [];
  let buf: MessagePart[] = [];
  const flush = () => { if (buf.length) { segs.push({ kind: "process", parts: buf }); buf = []; } };
  for (const p of parts) {
    if (isProcessPart(p)) { buf.push(p); }
    else { flush(); segs.push({ kind: "content", part: p }); }
  }
  flush();
  return segs;
}

const MessageBubble = memo(function MessageBubble({ msg, streaming }: { msg: ChatMessage; streaming: boolean }) {
  const [copied, setCopied] = useState(false);

  if (msg.role === "user") {
    const rawContent = msg.parts[0]?.content || "";
    // Strip [Attached files: ...] prefix from display (it's for the LLM, not the user)
    const text = rawContent.replace(/^\[Attached files:[^\]]*\]\s*/s, "").replace(/^\[Referenced skills:[^\]]*\]\s*/s, "").trim();
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    return (
      <div className="group/user flex justify-end">
        <div className="flex items-end gap-1.5">
          <button onClick={handleCopy}
            className="mb-1 rounded p-1 text-[#9f9c93] opacity-0 transition hover:text-[#29291f] group-hover/user:opacity-100">
            <CopyIcon copied={copied} />
          </button>
          <div className="max-w-3xl rounded-2xl bg-[#eeece8] px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {msg.files?.map((f) => (
                <span key={f.path}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#29291f]/[0.04] px-2 py-0.5 text-[12px] font-medium text-[#29291f]/70">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                    f.kind === "skill" || f.kind === "command" ? "bg-[#d97757]"
                    : f.kind === "datasource" ? "bg-[#788c5d]"
                    : f.kind === "task" ? "bg-[#a07cc5]"
                    : "bg-[#6a9bcc]"
                  }`} />
                  <span className="max-w-[200px] truncate">{f.name}</span>
                </span>
              ))}
              {text && <span className="text-[15px] leading-7 text-[#29291f] whitespace-pre-wrap">{text}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant
  const segments = segmentParts(msg.parts);
  let lastProcessIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].kind === "process") { lastProcessIdx = i; break; }
  }

  const outputText = msg.parts.filter((p) => p.type === "text").map((p) => p.content || "").join("\n");
  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isLast = streaming && msg.parts.length === 0;

  return (
    <div className="group/assistant flex justify-start">
      <div className="w-full max-w-4xl py-2">
        {isLast && (
          <ThinkingBlock content="" isStreaming />
        )}
        {segments.map((seg, i) => (
          <div key={i}>
            {seg.kind === "process" ? (
              <CollapsibleProcess
                parts={seg.parts}
                showDone={i === lastProcessIdx && !streaming}
                streaming={streaming}
              />
            ) : seg.part.type === "text" && seg.part.content ? (
              <div className="prose text-[15px] text-[#29291f] max-w-none leading-7">
                <Markdown remarkPlugins={[remarkGfm]}>{seg.part.content}</Markdown>
              </div>
            ) : null}
          </div>
        ))}
        {outputText && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover/assistant:opacity-100">
            <button onClick={handleCopyOutput}
              className="rounded p-1 text-[#9f9c93] transition hover:text-[#29291f]">
              <CopyIcon copied={copied} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
//  ChatPanel (main container)
// ═══════════════════════════════════════════════════════════════

// ── Model options (Claude Code models) ───────────────────────

const MODEL_OPTIONS: { id: string; label: string }[] = [
  { id: "claude-sonnet-4-5", label: "Sonnet 4.5" },
  { id: "claude-opus-4-6", label: "Opus 4.6" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5" },
];

const DEFAULT_MODEL = "claude-sonnet-4-5";

function modelLabel(id?: string): string {
  const match = MODEL_OPTIONS.find((o) => o.id === (id || DEFAULT_MODEL));
  return match?.label ?? id ?? "Sonnet 4.5";
}

export default function ChatPanel() {
  const {
    serverUrl, activeSessionId, messages, streaming, currentProject,
    setActiveSession, addSession, appendMessage, updateMessage,
    setStreaming, files, setFiles, setSessions,
    activeAgent, setActiveAgent,
  } = useStore();

  const [input, setInput] = useState("");
  type AttachmentKind = "file" | "skill" | "command" | "task" | "datasource";
  const [attachments, setAttachments] = useState<{ path: string; name: string; kind: AttachmentKind }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Datasource list for this project. Fetched on project change; used by
  // the @ popover and the send path to expand datasource attachments into
  // structured handles the agent can act on via query_datasource.
  const [datasources, setDatasources] = useState<api.DatasourceSummary[]>([]);
  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    api
      .fetchDatasources(serverUrl)
      .then((ds) => {
        if (!cancelled) setDatasources(ds);
      })
      .catch(() => {
        if (!cancelled) setDatasources([]);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, currentProject]);
  const datasourcesById = useMemo(() => {
    const m = new Map<string, api.DatasourceSummary>();
    for (const d of datasources) m.set(d.id, d);
    return m;
  }, [datasources]);

  // Task list for this project. Used both for the @ popover (so the
  // user can reference tasks by name) and for the send path, which
  // expands task attachments into a structured prompt header with
  // the task body inlined.
  const [tasks, setTasks] = useState<api.TaskFile[]>([]);
  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    api
      .fetchTasks(serverUrl)
      .then((t) => {
        if (!cancelled) setTasks(t);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, currentProject]);
  const tasksByName = useMemo(() => {
    const m = new Map<string, api.TaskFile>();
    for (const t of tasks) m.set(t.name, t);
    return m;
  }, [tasks]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const dragCounterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Reference popover (/, @ autocomplete) ───────────────
  // Triggers a small picker above the textarea when the user types
  // a sigil at a word boundary. Selecting an item replaces the sigil
  // + query with a `<sigil><name>` reference token.
  const [popover, setPopover] = useState<{
    trigger: "/" | "@";
    startIdx: number;
    query: string;
  } | null>(null);
  const [popoverIdx, setPopoverIdx] = useState(0);

  // ── Project model selector ──────────────────────────────
  const [projectModel, setProjectModel] = useState<string>(DEFAULT_MODEL);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    api
      .fetchProjectSettings(serverUrl, currentProject)
      .then((s) => {
        if (s.model) {
          setProjectModel(s.model);
        } else {
          // Legacy projects without a model — write the default so UI and
          // SDK stay in sync.
          setProjectModel(DEFAULT_MODEL);
          api
            .updateProjectSettings(serverUrl, currentProject, { model: DEFAULT_MODEL })
            .catch(() => {});
        }
      })
      .catch(() => setProjectModel(DEFAULT_MODEL));
  }, [currentProject, serverUrl]);

  async function handleSelectModel(model: string) {
    if (!currentProject) return;
    setProjectModel(model);
    setModelMenuOpen(false);
    try {
      await api.updateProjectSettings(serverUrl, currentProject, { model });
    } catch {}
  }

  const currentMessages = activeSessionId ? (messages[activeSessionId] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // ── File attachment helpers ─────────────────────────────

  function addAttachment(path: string, name: string, kind: AttachmentKind = "file") {
    setAttachments((prev) =>
      prev.some((a) => a.path === path) ? prev : [...prev, { path, name, kind }],
    );
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
  }

  async function uploadAndAttach(file: File) {
    setUploadingCount((c) => c + 1);
    try {
      const result = await api.uploadFile(serverUrl, file);
      addAttachment(result.path, result.name);
    } catch (e) {
      console.error("Upload failed:", e);
    }
    setUploadingCount((c) => c - 1);
  }

  // ── Drag handlers on input area ─────────────────────────

  function handleInputDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current > 0) setIsDragging(true);
  }

  function handleInputDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  }

  function handleInputDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  async function handleInputDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    // Internal drag from sidebar (file, skill, command, task, datasource)
    if (e.dataTransfer.types.includes("x-unispace-drag")) {
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        const kind = data.type as AttachmentKind | undefined;
        if (kind && ["file", "skill", "command", "task", "datasource"].includes(kind)) {
          addAttachment(data.path || data.id || data.name, data.name || data.label, kind);
        }
      } catch {}
      return;
    }

    // External file drag
    for (const file of Array.from(e.dataTransfer.files)) {
      uploadAndAttach(file);
    }
  }

  // ── Paste handler ───────────────────────────────────────

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadAndAttach(file);
      }
    }
  }

  // ── Send ────────────────────────────────────────────────

  async function sendMessage() {
    if ((!input.trim() && attachments.length === 0) || streaming) return;
    const rawText = input.trim();
    setInput("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Subagents are invoked via the sticky "Use as persona" button on
    // the Customize → Subagents detail page (sets activeAgent). The
    // chat input has no `#name` shortcut.
    const promptText = rawText;

    // Build message content with resource references. File/skill/command/
    // task refs stay as bracketed text markers. Datasource refs get a
    // richer block that tells the agent exactly which ids to query via
    // the `query_datasource` MCP tool — text markers alone aren't enough
    // because a bare name gives the agent no handle to act on.
    let content = promptText;
    if (attachments.length > 0) {
      const byKind = (k: AttachmentKind) =>
        attachments.filter((a) => a.kind === k);
      const markers: string[] = [];
      const fRefs = byKind("file").map((a) => a.path);
      const sRefs = byKind("skill").map((a) => a.name);
      const cRefs = byKind("command").map((a) => a.name);
      const dAttachments = byKind("datasource");
      const tAttachments = byKind("task");

      if (fRefs.length) markers.push(`[Attached files: ${fRefs.join(", ")}]`);
      if (sRefs.length) markers.push(`[Referenced skills: ${sRefs.join(", ")}]`);
      if (cRefs.length) markers.push(`[Referenced commands: ${cRefs.join(", ")}]`);

      if (tAttachments.length) {
        const lines = tAttachments.map((a) => {
          const t = tasksByName.get(a.path);
          const trig = t?.trigger || "manual";
          const body = t?.body
            ? t.body
                .split("\n")
                .map((l) => `      ${l}`)
                .join("\n")
            : "      (task body not loaded)";
          return `  - name="${a.path}" trigger=${trig}\n${body}`;
        });
        markers.push(
          [
            "[Project tasks referenced for this turn — each entry is a preset workflow stored under `.claude/tasks/`. Treat the indented body as what the user wants you to run, applied to the current project context. If the user also typed a message below, combine the task with it.]",
            ...lines,
          ].join("\n"),
        );
      }

      if (dAttachments.length) {
        const lines = dAttachments.map((a) => {
          const ds = datasourcesById.get(a.path);
          const name = ds?.display_name || ds?.name || a.name;
          const type = ds?.type || "datasource";
          const desc = ds?.description
            ? ds.description.split("\n")[0].slice(0, 160)
            : "";
          return `  - id="${a.path}"  type=${type}  name="${name}"${desc ? `\n      ${desc}` : ""}`;
        });
        markers.push(
          [
            "[Datasources referenced for this turn — use the `query_datasource` tool with these exact ids. Call `get_datasource_schema` first if you need field details. If any tool response contains a `_demo_note` field, you MUST mention it in your final reply so the user knows the data is a cached sample.]",
            ...lines,
          ].join("\n"),
        );
      }

      content = markers.join("\n") + (promptText ? `\n\n${promptText}` : "");
    }

    const msgFiles = attachments.length > 0 ? attachments.map(({ path, name, kind }) => ({ path, name, kind })) : undefined;

    let sid = activeSessionId;
    if (!sid) {
      const data = await api.createSession(serverUrl);
      sid = data.id as string;
      const title = rawText.length > 40 ? rawText.slice(0, 40) + "..." : rawText || attachments[0]?.name || "Session";
      addSession({ id: sid, createdAt: data.createdAt, messageCount: 0, title });
      setActiveSession(sid);
    }
    const sessionId = sid as string;

    appendMessage(sessionId, {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", content: rawText }],
      files: msgFiles,
    });
    const asstId = crypto.randomUUID();
    appendMessage(sessionId, { id: asstId, role: "assistant", parts: [] });
    setStreaming(true);

    try {
      for await (const { event, data } of api.streamMessage(serverUrl, sessionId, content, activeAgent?.name)) {
        updateMessage(sessionId, asstId, (parts) => {
          const p = [...parts];
          switch (event) {
            case "text_delta": {
              const last = p[p.length - 1];
              if (last?.type === "text") {
                p[p.length - 1] = { ...last, content: (last.content || "") + data.content };
              } else {
                p.push({ type: "text", content: data.content });
              }
              break;
            }
            case "thinking_delta": {
              const last = p[p.length - 1];
              if (last?.type === "thinking") {
                p[p.length - 1] = { ...last, content: (last.content || "") + data.content };
              } else {
                p.push({ type: "thinking", content: data.content });
              }
              break;
            }
            case "tool_call":
              p.push({ type: "tool_call", id: data.id, name: data.name, input: data.input });
              break;
            case "tool_result": {
              const idx = p.findIndex((x) => x.type === "tool_call" && x.id === data.id);
              if (idx >= 0) p[idx] = { ...p[idx], output: data.content, isError: data.is_error };
              break;
            }
            case "error":
              p.push({ type: "text", content: `\n**Error:** ${data.message}` });
              break;
          }
          return p;
        });
      }
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      setStreaming(false);
      Promise.all([api.fetchFiles(serverUrl), api.fetchSessions(serverUrl)])
        .then(([f, s]) => { setFiles(f); setSessions(s); })
        .catch(() => {});
    }
  }

  // ── Reference popover candidates ─────────────────────────
  // Built from the file tree: / → CLAUDE.md + commands/,
  // @ → all user files (excluding hoisted resource folders).

  type RefItem = { name: string; path: string; hint?: string; kind?: AttachmentKind };
  const HOISTED = new Set([
    "CLAUDE.md",
    "sessions",
    "skills",
    "agents",
    "commands",
  ]);

  const candidates: RefItem[] = useMemo(() => {
    if (!popover) return [];
    const q = popover.query.toLowerCase();
    const pool: RefItem[] = [];

    if (popover.trigger === "/") {
      const claudeMd = files.find((f) => f.name === "CLAUDE.md");
      if (claudeMd) {
        pool.push({ name: "CLAUDE.md", path: claudeMd.path || claudeMd.name, hint: "main prompt" });
      }
      const cmdFolder = files.find(
        (f) => f.name === "commands" && f.type === "directory",
      );
      for (const c of cmdFolder?.children || []) {
        if (c.type === "file" && c.name.toLowerCase().endsWith(".md")) {
          pool.push({ name: c.name.replace(/\.md$/i, ""), path: c.path });
        }
      }
    } else if (popover.trigger === "@") {
      // Files
      const walk = (list: FileEntry[]) => {
        for (const f of list) {
          if (HOISTED.has(f.name)) continue;
          if (f.type === "file") {
            pool.push({ name: f.name, path: f.path, kind: "file" });
          }
          if (f.children) walk(f.children);
        }
      };
      walk(files);
      // Datasources — real list from the backend.
      for (const ds of datasources) {
        pool.push({
          name: ds.display_name || ds.name,
          path: ds.id,
          hint: ds.type,
          kind: "datasource",
        });
      }
      // Tasks — real list from the backend.
      for (const t of tasks) {
        pool.push({
          name: t.name,
          path: t.name,
          hint: `task · ${t.trigger}`,
          kind: "task",
        });
      }
    }

    return pool
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover, files, datasources, tasks]);

  function handlePopoverSelect(item: RefItem) {
    if (!popover) return;
    const ref = popover.trigger + item.name;
    const before = input.slice(0, popover.startIdx);
    const after = input.slice(popover.startIdx + 1 + popover.query.length);
    const newInput = before + ref + " " + after;
    setInput(newInput);
    setPopover(null);
    // Stash in the attachment chip strip. The `kind` determines which
    // `[Referenced ...]` marker it ends up in when the message is sent.
    if (popover.trigger === "@") {
      addAttachment(item.path, item.name, item.kind ?? "file");
    }
    // Refocus textarea so the user can keep typing without re-clicking.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (popover && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPopoverIdx((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPopoverIdx((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handlePopoverSelect(candidates[popoverIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPopover(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";

    // Detect /, @ trigger at word boundary just before the cursor.
    const cursor = e.target.selectionStart ?? e.target.value.length;
    const beforeCursor = e.target.value.slice(0, cursor);
    const m = beforeCursor.match(/(?:^|\s)([\/@])([^\s]*)$/);
    if (m) {
      const trigger = m[1] as "/" | "@";
      const query = m[2];
      const startIdx = cursor - query.length - 1;
      setPopover({ trigger, startIdx, query });
      setPopoverIdx(0);
    } else if (popover) {
      setPopover(null);
    }
  }

  const isEmpty = currentMessages.length === 0;

  // The full-featured input bar is defined once and rendered in one
  // of two positions: between hero and gallery (empty state) or
  // pinned at the bottom (non-empty). Same JSX either way — model
  // picker, agent chip, attachments, streaming/stop button all live
  // in a single source of truth.
  const inputBar: ReactNode = (
    <div className="bg-[#fafaf7] px-4 pb-5 pt-2 shrink-0">
        <div className="relative mx-auto flex max-w-3xl flex-col gap-2">
          {activeAgent && (
            <div className="flex items-center gap-2 self-start rounded-full border border-[#a07cc5]/25 bg-[#a07cc5]/[0.06] pl-2.5 pr-1 py-1 text-[11px]">
              <svg
                className="h-3 w-3 shrink-0 text-[#a07cc5]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span className="text-[#6b4f88] font-medium">Agent:</span>
              <span className="max-w-[160px] truncate text-[#29291f]">{activeAgent.name}</span>
              <button
                onClick={() => setActiveAgent(null)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#a07cc5]/70 transition hover:bg-[#a07cc5]/15 hover:text-[#a07cc5]"
                title="Unapply"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div
            className={`relative flex items-end gap-3 rounded-[20px] border bg-white p-3 shadow-[0_2px_12px_rgba(20,20,19,0.04)] transition-colors ${
              isDragging ? "border-[#29291f] bg-[#29291f]/[0.02]" : "border-[rgba(41,41,31,0.1)]/80"
            }`}
            onDragEnter={handleInputDragEnter}
            onDragLeave={handleInputDragLeave}
            onDragOver={handleInputDragOver}
            onDrop={handleInputDrop}
          >
            {/* Reference popover (/, #, @ autocomplete) */}
            {popover && (
              <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[260px] overflow-y-auto rounded-xl border border-[rgba(41,41,31,0.1)] bg-white p-1 shadow-[0_8px_24px_rgba(20,20,19,0.08)]">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#9f9c93]">
                    {popover.trigger === "/" ? "Commands" : "Files"}
                  </span>
                  <span className="text-[10px] text-[#9f9c93]">
                    ↑↓ to navigate · Enter to insert
                  </span>
                </div>
                {candidates.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-[#9f9c93]">
                    No matches
                  </div>
                ) : (
                  candidates.map((c, i) => (
                    <button
                      key={c.path}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePopoverSelect(c);
                      }}
                      onMouseEnter={() => setPopoverIdx(i)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[12px] transition ${
                        i === popoverIdx ? "bg-[#fafaf7]" : ""
                      }`}
                    >
                      <span
                        className={`shrink-0 text-[11px] font-mono ${
                          popover.trigger === "/"
                            ? "text-[#29291f]"
                            : c.kind === "datasource"
                              ? "text-[#788c5d]"
                              : "text-[#6a9bcc]"
                        }`}
                      >
                        {popover.trigger}
                      </span>
                      <span className="truncate font-medium text-[#29291f]">
                        {c.name}
                      </span>
                      {c.hint && (
                        <span className="truncate text-[#9f9c93]">
                          — {c.hint}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-white/90">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#29291f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[13px] text-[#29291f] font-medium">Drop to attach</span>
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Reply..."
                rows={1}
                className="min-h-[44px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-7 text-[#29291f] outline-none placeholder:text-[#9f9c93]"
              />

              {/* Attachment chips */}
              {(attachments.length > 0 || uploadingCount > 0) && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-1 pb-0.5">
                  {attachments.map((a) => (
                    <span
                      key={a.path}
                      className="inline-flex items-center gap-1 rounded-md bg-[#29291f]/[0.04] px-2 py-0.5 text-[12px] text-[#29291f]/70"
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        a.kind === "skill" ? "bg-[#d97757]"
                        : a.kind === "command" ? "bg-[#d97757]"
                        : a.kind === "datasource" ? "bg-[#788c5d]"
                        : a.kind === "task" ? "bg-[#a07cc5]"
                        : "bg-[#6a9bcc]"
                      }`} />
                      <span className="max-w-[140px] truncate">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(a.path)}
                        className="ml-0.5 text-[#9f9c93] hover:text-[#29291f]"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {uploadingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#fafaf7] px-2 py-0.5 text-[12px] text-[#29291f]/70">
                      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[rgba(41,41,31,0.1)] border-t-[#29291f]" />
                      Uploading...
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 px-3 pb-0.5 pt-0.5">
                {/* Model dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setModelMenuOpen(!modelMenuOpen)}
                    className="flex items-center gap-1.5 rounded-full border border-[rgba(41,41,31,0.1)] bg-white px-2.5 py-1 text-[11px] text-[#6a685d] transition hover:border-[#9f9c93] hover:text-[#29291f]"
                  >
                    <svg className="h-3 w-3 text-[#29291f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                    </svg>
                    <span>{modelLabel(projectModel)}</span>
                    <svg className="h-2.5 w-2.5 text-[#9f9c93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {modelMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setModelMenuOpen(false)}
                      />
                      <div className="absolute bottom-full left-0 z-40 mb-1 min-w-[220px] rounded-xl border border-[rgba(41,41,31,0.1)] bg-white py-1 shadow-[0_8px_24px_rgba(20,20,19,0.08)]">
                        {MODEL_OPTIONS.map((opt) => {
                          const active = projectModel === opt.id;
                          return (
                            <button
                              key={opt.id || "default"}
                              onClick={() => handleSelectModel(opt.id)}
                              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition hover:bg-[#fafaf7] ${
                                active ? "text-[#29291f]" : "text-[#6a685d]"
                              }`}
                            >
                              <svg
                                className={`h-3 w-3 shrink-0 ${active ? "text-[#29291f]" : "text-transparent"}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              <span className="flex-1 truncate font-medium">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <span className="ml-auto text-[11px] text-[#8a8880]">Enter to send / Shift+Enter for newline</span>
              </div>
            </div>
            {streaming ? (
              <button
                onClick={() => {/* TODO: abort */}}
                className="mb-0.5 inline-flex h-10 items-center justify-center rounded-xl bg-[#29291f] px-5 text-[13px] font-medium text-[#fafaf7] transition hover:bg-[#29291f]/80"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim() && attachments.length === 0}
                className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#29291f] text-[#fafaf7] transition hover:bg-[#29291f]/80 disabled:cursor-not-allowed disabled:bg-[rgba(41,41,31,0.1)] disabled:text-[#9f9c93]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {isEmpty ? (
        <main className="flex-1 flex">
          <EmptyState inputBarSlot={inputBar} />
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-6 px-6 space-y-5">
              {currentMessages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  streaming={streaming && i === currentMessages.length - 1 && msg.role === "assistant"}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </main>
          {inputBar}
        </>
      )}
    </div>
  );
}
