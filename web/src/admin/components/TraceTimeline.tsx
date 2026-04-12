import { useMemo } from "react";
import { useTraceStore } from "../stores/traceStore";
import SpanRow from "./SpanRow";
import { SPAN_STATUS_ERROR } from "../types/trace";

export default function TraceTimeline() {
  const traceOverview = useTraceStore((s) => s.traceOverview);
  const typeFilter = useTraceStore((s) => s.typeFilter);
  const statusFilter = useTraceStore((s) => s.statusFilter);
  const nameSearch = useTraceStore((s) => s.nameSearch);

  const { rootStart, rootDuration, filtered } = useMemo(() => {
    if (!traceOverview) return { rootStart: 0, rootDuration: 0, filtered: [] };

    const root = traceOverview.root;
    const start = new Date(root.start_time).getTime();
    const dur = root.duration_ms || 1;

    let spans = traceOverview.children;

    if (typeFilter !== "all") {
      spans = spans.filter((s) => s.span_type === typeFilter);
    }
    if (statusFilter === "error") {
      spans = spans.filter((s) => s.status === SPAN_STATUS_ERROR);
    }
    if (nameSearch) {
      const needle = nameSearch.toLowerCase();
      spans = spans.filter((s) => s.name.toLowerCase().includes(needle));
    }

    return { rootStart: start, rootDuration: dur, filtered: spans };
  }, [traceOverview, typeFilter, statusFilter, nameSearch]);

  if (!traceOverview) return null;

  return (
    <div className="space-y-0.5">
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#b0aea5]">
          No spans match the current filter
        </p>
      ) : (
        filtered.map((span) => (
          <SpanRow
            key={span.id}
            span={span}
            rootStart={rootStart}
            rootDuration={rootDuration}
          />
        ))
      )}
    </div>
  );
}
