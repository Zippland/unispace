import type { Span } from "../types/trace";
import {
  SPAN_TYPE_LLM,
  SPAN_TYPE_TOOL,
  SPAN_STATUS_ERROR,
} from "../types/trace";
import { useTraceStore } from "../stores/traceStore";

function SpanIcon({ type }: { type: string }) {
  const color =
    type === SPAN_TYPE_LLM
      ? "bg-[#6a9bcc]"
      : type === SPAN_TYPE_TOOL
        ? "bg-[#d97757]"
        : "bg-[#788c5d]";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function spanColor(type: string) {
  switch (type) {
    case SPAN_TYPE_LLM:
      return "bg-[#6a9bcc]";
    case SPAN_TYPE_TOOL:
      return "bg-[#d97757]";
    default:
      return "bg-[#788c5d]";
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface SpanRowProps {
  span: Span;
  rootStart: number;
  rootDuration: number;
  depth?: number;
}

export default function SpanRow({
  span,
  rootStart,
  rootDuration,
  depth = 0,
}: SpanRowProps) {
  const selectedSpan = useTraceStore((s) => s.selectedSpan);
  const selectSpan = useTraceStore((s) => s.selectSpan);
  const expandedSpans = useTraceStore((s) => s.expandedSpans);
  const toggleExpand = useTraceStore((s) => s.toggleExpand);
  const childrenMap = useTraceStore((s) => s.childrenMap);

  const isSelected = selectedSpan?.id === span.id;
  const isExpanded = expandedSpans.has(span.id);
  const children = childrenMap[span.id] || [];
  const hasChildren = span.children_count > 0;
  const isError = span.status === SPAN_STATUS_ERROR;

  // Timeline bar position
  const spanStart = new Date(span.start_time).getTime();
  const offset = rootDuration > 0 ? ((spanStart - rootStart) / rootDuration) * 100 : 0;
  const width = rootDuration > 0 ? Math.max((span.duration_ms / rootDuration) * 100, 0.5) : 100;

  return (
    <>
      <div
        onClick={() => selectSpan(span.trace_id, span.id)}
        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition ${
          isSelected
            ? "bg-[#d97757]/10 ring-1 ring-[#d97757]/30"
            : isError
              ? "bg-red-50 hover:bg-red-100/60"
              : "hover:bg-[#f7f6f2]"
        }`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(span.trace_id, span.id);
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center text-[10px] ${
            hasChildren ? "text-[#6b6963]" : "text-transparent"
          }`}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : "·"}
        </button>

        {/* Icon + name */}
        <SpanIcon type={span.span_type} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#141413]">
          {span.name}
        </span>

        {/* Duration */}
        <span className="shrink-0 text-[10px] text-[#b0aea5]">
          {formatDuration(span.duration_ms)}
        </span>

        {/* Status badge */}
        {isError && (
          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-600">
            error
          </span>
        )}

        {/* Timeline bar */}
        <div className="relative h-2 w-32 shrink-0 overflow-hidden rounded-full bg-[#e8e6dc]/50">
          <div
            className={`absolute top-0 h-full rounded-full ${spanColor(span.span_type)} opacity-70`}
            style={{ left: `${offset}%`, width: `${width}%` }}
          />
        </div>
      </div>

      {/* Expanded children */}
      {isExpanded &&
        children.map((child) => (
          <SpanRow
            key={child.id}
            span={child}
            rootStart={rootStart}
            rootDuration={rootDuration}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
