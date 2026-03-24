import { useState, useEffect, useRef, memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type MessagePart, type ChatMessage } from "../store";
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

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!content && !isStreaming) return null;

  const isLong = !isStreaming && content.length > 200;
  const summary = content.split("\n")[0].trim().slice(0, 50) || "Thinking...";
  const isCollapsed = isLong && !expanded;

  return (
    <div className="relative pl-8 pb-1">
      <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center text-[#b0aea5]">
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
      <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[#e8e6dc]" />
      <div>
        {isCollapsed ? (
          <button onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 text-[13px] text-[#b0aea5] transition hover:text-[#141413]">
            <span>{summary}...</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[#b0aea5]/50" />
          </button>
        ) : (
          <div>
            {isLong && (
              <button onClick={() => setExpanded(false)}
                className="mb-1 flex items-center gap-1.5 text-[13px] text-[#b0aea5] transition hover:text-[#141413]">
                <span>{summary}...</span>
                <ChevronDown className="h-3 w-3 shrink-0 rotate-180 text-[#b0aea5]/50" />
              </button>
            )}
            <div className="text-[13px] leading-relaxed text-[#b0aea5]">
              <pre className="whitespace-pre-wrap font-[inherit]">{content || "Thinking..."}</pre>
            </div>
          </div>
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
        <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center text-[#b0aea5]">
          <ToolIcon name={part.name || ""} className={`h-[18px] w-[18px] ${loading ? "animate-pulse text-[#d97757]" : ""}`} />
        </div>
        <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[#e8e6dc]" />
        <button
          onClick={() => hasDetail && setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[13px] text-[#b0aea5] transition hover:text-[#141413]"
        >
          <span>{loading ? `${part.name}...` : part.name}</span>
          {hasDetail && !loading && (
            <ChevronDown className={`h-3 w-3 text-[#b0aea5]/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
          )}
        </button>
        {expanded && (
          <div className="mt-2 space-y-2 text-xs text-[#b0aea5]">
            {hasInput && (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[#141413]/[0.03] p-3 font-mono">
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
          <div className="absolute left-[9px] top-6 bottom-0 w-px bg-[#e8e6dc]" />
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1.5 text-[13px] transition hover:text-[#141413] ${isError ? "text-[#d97757]" : "text-[#b0aea5]"}`}
          >
            <span>{isError ? `${part.name} failed` : `${part.name} done`}</span>
            <ChevronDown className={`h-3 w-3 text-[#b0aea5]/50 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <pre className={`mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#141413]/[0.03] p-3 font-mono text-xs ${isError ? "text-[#d97757]" : "text-[#b0aea5]"}`}>
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
      <span className="text-[13px] text-[#b0aea5]">Done</span>
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

function CollapsibleProcess({ parts, showDone }: { parts: MessagePart[]; showDone: boolean }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="mb-1">
      <button onClick={() => setCollapsed(!collapsed)}
        className="mb-1 flex items-center gap-1.5 text-[13px] text-[#b0aea5] transition hover:text-[#141413]">
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
//  Empty State (rotating quotes)
// ═══════════════════════════════════════════════════════════════

const quotes: [string, string][] = [
  ["Start with a question", "end with a solution"],
  ["Clear description", "is half the work done"],
  ["Complex things", "begin with a single sentence"],
  ["Precise conclusions", "start from a vague thought"],
  ["Good questions", "find their own answers"],
];

function EmptyState() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length);
        setFade(true);
      }, 400);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const [line1, line2] = quotes[index];
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <svg className="h-6 w-6 text-[#d97757]/25" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>
      <p className={`mt-3 text-center text-xl font-medium leading-snug tracking-tight text-[#141413] transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}>
        {line1}
        <br />
        <span className="text-[#b0aea5]">{line2}</span>
      </p>
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
            className="mb-1 rounded p-1 text-[#b0aea5] opacity-0 transition hover:text-[#141413] group-hover/user:opacity-100">
            <CopyIcon copied={copied} />
          </button>
          <div className="max-w-3xl rounded-2xl bg-[#eeece8] px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {msg.files?.map((f) => (
                <span key={f.path}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#141413]/[0.04] px-2 py-0.5 text-[12px] font-medium text-[#141413]/70">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${f.kind === "skill" ? "bg-[#d97757]" : "bg-[#6a9bcc]"}`} />
                  <span className="max-w-[200px] truncate">{f.name}</span>
                </span>
              ))}
              {text && <span className="text-[15px] leading-7 text-[#141413] whitespace-pre-wrap">{text}</span>}
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
              <CollapsibleProcess parts={seg.parts} showDone={i === lastProcessIdx && !streaming} />
            ) : seg.part.type === "text" && seg.part.content ? (
              <div className="prose text-[15px] text-[#141413] max-w-none leading-7">
                <Markdown remarkPlugins={[remarkGfm]}>{seg.part.content}</Markdown>
              </div>
            ) : null}
          </div>
        ))}
        {outputText && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition group-hover/assistant:opacity-100">
            <button onClick={handleCopyOutput}
              className="rounded p-1 text-[#b0aea5] transition hover:text-[#141413]">
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

export default function ChatPanel() {
  const {
    serverUrl, activeSessionId, messages, streaming,
    setActiveSession, addSession, appendMessage, updateMessage,
    setStreaming, setFiles, setSessions,
  } = useStore();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ path: string; name: string; kind: "file" | "skill" }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const dragCounterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentMessages = activeSessionId ? (messages[activeSessionId] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // ── File attachment helpers ─────────────────────────────

  function addAttachment(path: string, name: string, kind: "file" | "skill" = "file") {
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

    // Internal drag from sidebar (file or skill)
    if (e.dataTransfer.types.includes("x-unispace-drag")) {
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data.type === "file" || data.type === "skill") {
          addAttachment(data.path, data.name, data.type);
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

    // Build message content with file references
    let content = rawText;
    if (attachments.length > 0) {
      const fileRefs = attachments.filter((a) => a.kind === "file").map((a) => a.path);
      const skillRefs = attachments.filter((a) => a.kind === "skill").map((a) => a.name);
      const parts: string[] = [];
      if (fileRefs.length) parts.push(`[Attached files: ${fileRefs.join(", ")}]`);
      if (skillRefs.length) parts.push(`[Referenced skills: ${skillRefs.join(", ")}]`);
      content = parts.join("\n") + (rawText ? `\n\n${rawText}` : "");
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
      for await (const { event, data } of api.streamMessage(serverUrl, sessionId, content)) {
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Messages */}
      {currentMessages.length === 0 ? (
        <main className="flex-1 flex">
          <EmptyState />
        </main>
      ) : (
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
      )}

      {/* Input area */}
      <div className="bg-[#faf9f5] px-4 pb-5 pt-2 shrink-0">
        <div className="relative mx-auto flex max-w-3xl flex-col gap-2">
          <div
            className={`relative flex items-end gap-3 rounded-[20px] border bg-white p-3 shadow-[0_2px_12px_rgba(20,20,19,0.04)] transition-colors ${
              isDragging ? "border-[#d97757] bg-[#d97757]/[0.02]" : "border-[#e8e6dc]/80"
            }`}
            onDragEnter={handleInputDragEnter}
            onDragLeave={handleInputDragLeave}
            onDragOver={handleInputDragOver}
            onDrop={handleInputDrop}
          >
            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-white/90">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#d97757]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[13px] text-[#d97757] font-medium">Drop to attach</span>
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
                className="min-h-[44px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-7 text-[#141413] outline-none placeholder:text-[#b0aea5]"
              />

              {/* Attachment chips */}
              {(attachments.length > 0 || uploadingCount > 0) && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-1 pb-0.5">
                  {attachments.map((a) => (
                    <span
                      key={a.path}
                      className="inline-flex items-center gap-1 rounded-md bg-[#141413]/[0.04] px-2 py-0.5 text-[12px] text-[#141413]/70"
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${a.kind === "skill" ? "bg-[#d97757]" : "bg-[#6a9bcc]"}`} />
                      <span className="max-w-[140px] truncate">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(a.path)}
                        className="ml-0.5 text-[#b0aea5] hover:text-[#d97757]"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {uploadingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#faf9f5] px-2 py-0.5 text-[12px] text-[#141413]/70">
                      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#e8e6dc] border-t-[#d97757]" />
                      Uploading...
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center px-3 pb-0.5 pt-0.5">
                <span className="text-[11px] text-[#8a8880]">Enter to send / Shift+Enter for newline / Drop files to attach</span>
              </div>
            </div>
            {streaming ? (
              <button
                onClick={() => {/* TODO: abort */}}
                className="mb-0.5 inline-flex h-10 items-center justify-center rounded-xl bg-[#141413] px-5 text-[13px] font-medium text-[#faf9f5] transition hover:bg-[#141413]/80"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim() && attachments.length === 0}
                className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#141413] text-[#faf9f5] transition hover:bg-[#141413]/80 disabled:cursor-not-allowed disabled:bg-[#e8e6dc] disabled:text-[#b0aea5]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
