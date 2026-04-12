import { useTraceStore } from "../stores/traceStore";

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "llm_call", label: "LLM" },
  { value: "tool_call", label: "Tool" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "error", label: "Error" },
] as const;

export default function SpanFilter() {
  const typeFilter = useTraceStore((s) => s.typeFilter);
  const statusFilter = useTraceStore((s) => s.statusFilter);
  const nameSearch = useTraceStore((s) => s.nameSearch);
  const setTypeFilter = useTraceStore((s) => s.setTypeFilter);
  const setStatusFilter = useTraceStore((s) => s.setStatusFilter);
  const setNameSearch = useTraceStore((s) => s.setNameSearch);

  const pill = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
      active
        ? "border-[#d97757] bg-[#d97757]/10 text-[#d97757] font-medium"
        : "border-[#e8e6dc] text-[#141413]/60 hover:border-[#b0aea5]"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={nameSearch}
        onChange={(e) => setNameSearch(e.target.value)}
        placeholder="Filter by name..."
        className="w-40 rounded-lg border border-[#e8e6dc] bg-white px-2.5 py-1 text-xs text-[#141413] outline-none placeholder:text-[#b0aea5] focus:border-[#d97757]"
      />

      <span className="ml-1 text-[10px] uppercase tracking-wider text-[#b0aea5]">
        Type
      </span>
      {TYPE_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setTypeFilter(o.value as any)}
          className={pill(typeFilter === o.value)}
        >
          {o.label}
        </button>
      ))}

      <span className="ml-2 text-[10px] uppercase tracking-wider text-[#b0aea5]">
        Status
      </span>
      {STATUS_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setStatusFilter(o.value as any)}
          className={pill(statusFilter === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
