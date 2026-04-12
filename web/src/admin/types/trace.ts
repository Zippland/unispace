// Span type constants — mirror finance_agent format
export const SPAN_TYPE_ROOT = "root" as const;
export const SPAN_TYPE_LLM = "llm_call" as const;
export const SPAN_TYPE_TOOL = "tool_call" as const;

export const SPAN_STATUS_RUNNING = "running" as const;
export const SPAN_STATUS_SUCCESS = "success" as const;
export const SPAN_STATUS_ERROR = "error" as const;

export type SpanType =
  | typeof SPAN_TYPE_ROOT
  | typeof SPAN_TYPE_LLM
  | typeof SPAN_TYPE_TOOL;

export type SpanStatus =
  | typeof SPAN_STATUS_RUNNING
  | typeof SPAN_STATUS_SUCCESS
  | typeof SPAN_STATUS_ERROR;

export interface Span {
  id: string;
  trace_id: string;
  parent_id: string | null;
  name: string;
  span_type: SpanType;
  status: SpanStatus;
  start_time: string;
  duration_ms: number;
  input_data?: string;
  output_data?: string;
  metadata: Record<string, unknown>;
  error?: string;
  children_count: number;
}

export interface TraceListItem {
  id: string;
  trace_id: string;
  project: string;
  session_id?: string;
  agent_name?: string;
  query_preview: string;
  status: SpanStatus;
  start_time: string;
  created_at: string;
  duration_ms: number;
  span_count: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface TraceOverview {
  root: Span;
  children: Span[];
}
