import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTraceStore } from "../stores/traceStore";

export default function TraceSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const traceOverview = useTraceStore((s) => s.traceOverview);
  const clearSearch = useTraceStore((s) => s.clearSearch);

  const initialValue = traceOverview
    ? ""
    : searchParams.get("search") || "";
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    // If it looks like a UUID, treat as trace ID
    if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
      navigate(`/admin/traces/${trimmed}`);
    } else {
      const params = new URLSearchParams();
      params.set("search", trimmed);
      navigate(`/admin/traces?${params.toString()}`);
    }
  }

  function handleBack() {
    clearSearch();
    navigate("/admin/traces");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      {traceOverview && (
        <button
          type="button"
          onClick={handleBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e6dc] text-[#141413]/50 transition hover:bg-white hover:text-[#141413]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
      )}
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by Trace ID or keyword..."
          className="w-full rounded-lg border border-[#e8e6dc] bg-white px-3 py-2 text-sm text-[#141413] outline-none transition placeholder:text-[#b0aea5] focus:border-[#d97757]"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              navigate("/admin/traces");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0aea5] hover:text-[#141413]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        className="rounded-lg bg-[#141413] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a28]"
      >
        Search
      </button>
    </form>
  );
}
