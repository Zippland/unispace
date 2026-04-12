import { join } from "path";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "fs";
import { paths } from "./config";
import type { AgentEvent } from "./agent";

// ── Data model ──────────────────────────────────────────────
// Compatible with the finance_agent admin trace format so the
// admin UI components can be reused with minimal adaptation.

export type SpanType = "root" | "llm_call" | "tool_call";
export type SpanStatus = "running" | "success" | "error";

export interface Span {
  id: string;
  trace_id: string;
  parent_id: string | null;
  name: string;
  span_type: SpanType;
  status: SpanStatus;
  start_time: string; // ISO
  duration_ms: number;
  input_data?: string; // JSON string
  output_data?: string; // JSON string
  metadata: Record<string, unknown>;
  error?: string;
  children_count: number;
}

export interface Trace {
  id: string;
  project: string;
  session_id?: string;
  agent_name?: string;
  query_preview: string;
  status: SpanStatus;
  start_time: string;
  duration_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  error?: string;
  spans: Span[];
}

// ── Persistence ─────────────────────────────────────────────

function tracesDir(): string {
  const dir = paths.tracesRoot();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function traceFilePath(id: string): string {
  return join(tracesDir(), `${id}.json`);
}

export function saveTrace(trace: Trace): void {
  writeFileSync(traceFilePath(trace.id), JSON.stringify(trace, null, 2));
}

export function loadTrace(id: string): Trace | null {
  const p = traceFilePath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export interface TraceListOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TraceListResult {
  traces: Trace[];
  total: number;
}

/** List traces sorted by start_time desc, with pagination and optional
 *  text search (matches query_preview, project, agent_name). */
export function listTraces(opts: TraceListOptions = {}): TraceListResult {
  const { limit = 20, offset = 0, search } = opts;
  const dir = tracesDir();

  // Read all trace files, sort by mtime desc (newest first)
  let entries: Array<{ name: string; mtime: number }>;
  try {
    entries = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        mtime: statSync(join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return { traces: [], total: 0 };
  }

  // Load and optionally filter
  let all: Trace[] = [];
  for (const entry of entries) {
    try {
      const trace: Trace = JSON.parse(
        readFileSync(join(dir, entry.name), "utf-8"),
      );
      if (search) {
        const needle = search.toLowerCase();
        const haystack =
          `${trace.query_preview} ${trace.project} ${trace.agent_name || ""} ${trace.id}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }
      all.push(trace);
    } catch {
      // skip corrupt files
    }
  }

  return {
    total: all.length,
    traces: all.slice(offset, offset + limit),
  };
}

// ── Trace collection from agent events ──────────────────────
// Wraps a runAgent() AsyncGenerator to collect trace data from
// the event stream without altering it. Non-intrusive — the
// caller still iterates events exactly as before.

export interface TraceCollectorOptions {
  project: string;
  sessionId?: string;
  agentName?: string;
  prompt: string;
}

export function createTraceCollector(opts: TraceCollectorOptions) {
  const traceId = crypto.randomUUID();
  const rootSpanId = crypto.randomUUID();
  const startTime = new Date();

  const trace: Trace = {
    id: traceId,
    project: opts.project,
    session_id: opts.sessionId,
    agent_name: opts.agentName,
    query_preview:
      opts.prompt.length > 120
        ? opts.prompt.slice(0, 120) + "..."
        : opts.prompt,
    status: "running",
    start_time: startTime.toISOString(),
    duration_ms: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    spans: [],
  };

  // Root span
  const rootSpan: Span = {
    id: rootSpanId,
    trace_id: traceId,
    parent_id: null,
    name: "agent_turn",
    span_type: "root",
    status: "running",
    start_time: startTime.toISOString(),
    duration_ms: 0,
    metadata: {
      project: opts.project,
      agent_name: opts.agentName,
    },
    children_count: 0,
  };
  trace.spans.push(rootSpan);

  // Accumulator state for grouping events into spans
  let currentLlmSpan: Span | null = null;
  let currentLlmText = "";
  let currentThinkingText = "";
  // Map of pending tool calls (awaiting tool_result)
  const pendingTools = new Map<
    string,
    { span: Span; input: Record<string, unknown> }
  >();

  function finishLlmSpan() {
    if (!currentLlmSpan) return;
    currentLlmSpan.duration_ms = Date.now() - new Date(currentLlmSpan.start_time).getTime();
    currentLlmSpan.status = "success";
    currentLlmSpan.output_data = JSON.stringify({
      text: currentLlmText,
      thinking: currentThinkingText || undefined,
    });
    rootSpan.children_count++;
    currentLlmSpan = null;
    currentLlmText = "";
    currentThinkingText = "";
  }

  function ensureLlmSpan() {
    if (currentLlmSpan) return;
    currentLlmSpan = {
      id: crypto.randomUUID(),
      trace_id: traceId,
      parent_id: rootSpanId,
      name: "llm_response",
      span_type: "llm_call",
      status: "running",
      start_time: new Date().toISOString(),
      duration_ms: 0,
      metadata: {},
      children_count: 0,
    };
    trace.spans.push(currentLlmSpan);
  }

  function processEvent(event: AgentEvent) {
    switch (event.type) {
      case "text_delta":
        ensureLlmSpan();
        currentLlmText += event.content;
        break;

      case "thinking_delta":
        ensureLlmSpan();
        currentThinkingText += event.content;
        break;

      case "tool_call": {
        // Finish any open LLM span before starting tool span
        finishLlmSpan();
        const toolSpan: Span = {
          id: crypto.randomUUID(),
          trace_id: traceId,
          parent_id: rootSpanId,
          name: event.name,
          span_type: "tool_call",
          status: "running",
          start_time: new Date().toISOString(),
          duration_ms: 0,
          input_data: JSON.stringify(event.input),
          metadata: { tool_use_id: event.id },
          children_count: 0,
        };
        trace.spans.push(toolSpan);
        pendingTools.set(event.id, { span: toolSpan, input: event.input });
        rootSpan.children_count++;
        break;
      }

      case "tool_result": {
        const pending = pendingTools.get(event.id);
        if (pending) {
          pending.span.duration_ms =
            Date.now() - new Date(pending.span.start_time).getTime();
          pending.span.status = event.is_error ? "error" : "success";
          pending.span.output_data = event.content;
          if (event.is_error) pending.span.error = event.content;
          pendingTools.delete(event.id);
        }
        break;
      }

      case "error":
        finishLlmSpan();
        trace.error = event.message;
        trace.status = "error";
        rootSpan.status = "error";
        rootSpan.error = event.message;
        break;

      case "done":
        finishLlmSpan();
        // Close any still-pending tool spans
        for (const [, { span }] of pendingTools) {
          span.duration_ms =
            Date.now() - new Date(span.start_time).getTime();
          if (span.status === "running") span.status = "error";
        }
        pendingTools.clear();

        if (trace.status === "running") trace.status = "success";
        if (rootSpan.status === "running") rootSpan.status = "success";

        trace.duration_ms = Date.now() - startTime.getTime();
        rootSpan.duration_ms = trace.duration_ms;

        // Persist
        saveTrace(trace);
        break;
    }
  }

  return { traceId, processEvent };
}
