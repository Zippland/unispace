import { useState, useRef, useCallback, useEffect } from "react";
import { useTraceStore } from "../stores/traceStore";
import { SPAN_TYPE_LLM, SPAN_STATUS_ERROR } from "../types/trace";
import LlmInputView from "./LlmInputView";
import LlmOutputView from "./LlmOutputView";

type Tab = "overview" | "input" | "output";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SpanDetail() {
  const selectedSpan = useTraceStore((s) => s.selectedSpan);
  const isDetailLoading = useTraceStore((s) => s.isDetailLoading);
  const clearSelectedSpan = useTraceStore((s) => s.clearSelectedSpan);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [panelWidth, setPanelWidth] = useState(55); // percentage
  const resizeRef = useRef<boolean>(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    function onMove(ev: MouseEvent) {
      const dx = startX - ev.clientX;
      const vw = window.innerWidth;
      const newWidth = Math.min(90, Math.max(30, startWidth + (dx / vw) * 100));
      setPanelWidth(newWidth);
    }
    function onUp() {
      resizeRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  // Reset tab when span changes
  useEffect(() => {
    setActiveTab("overview");
  }, [selectedSpan?.id]);

  if (!selectedSpan) return null;

  const isError = selectedSpan.status === SPAN_STATUS_ERROR;
  const isLlm = selectedSpan.span_type === SPAN_TYPE_LLM;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(selectedSpan.input_data ? [{ key: "input" as Tab, label: "Input" }] : []),
    ...(selectedSpan.output_data ? [{ key: "output" as Tab, label: "Output" }] : []),
  ];

  return (
    <div
      className="relative flex shrink-0 flex-col border-l border-[#e8e6dc] bg-white"
      style={{ width: `${panelWidth}%` }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#d97757]/20"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e6dc] px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-semibold text-[#141413]"
          >
            {selectedSpan.name}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[#b0aea5]">
            {selectedSpan.span_type} · {selectedSpan.id.slice(0, 12)}...
          </p>
        </div>
        <button
          onClick={clearSelectedSpan}
          className="ml-2 flex h-6 w-6 items-center justify-center rounded text-[#b0aea5] hover:text-[#141413]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#e8e6dc] px-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative py-2 text-xs font-medium transition ${
              activeTab === t.key
                ? "text-[#141413]"
                : "text-[#b0aea5] hover:text-[#6b6963]"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#d97757]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {isDetailLoading ? (
          <p className="py-8 text-center text-sm text-[#b0aea5]">Loading...</p>
        ) : activeTab === "overview" ? (
          <div className="space-y-3">
            <InfoRow label="Status">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isError ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                }`}
              >
                {selectedSpan.status}
              </span>
            </InfoRow>
            <InfoRow label="Duration">{formatDuration(selectedSpan.duration_ms)}</InfoRow>
            <InfoRow label="Start">{new Date(selectedSpan.start_time).toLocaleString()}</InfoRow>
            <InfoRow label="Type">{selectedSpan.span_type}</InfoRow>

            {isError && selectedSpan.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[10px] font-semibold text-red-600">Error</p>
                <p className="mt-1 text-xs text-red-700">{selectedSpan.error}</p>
              </div>
            )}

            {Object.keys(selectedSpan.metadata).length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#b0aea5]">
                  Metadata
                </p>
                <pre className="whitespace-pre-wrap text-[10px] text-[#141413]/60">
                  {JSON.stringify(selectedSpan.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : activeTab === "input" && selectedSpan.input_data ? (
          isLlm ? (
            <LlmInputView data={selectedSpan.input_data} />
          ) : (
            <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">
              {tryFormatJson(selectedSpan.input_data)}
            </pre>
          )
        ) : activeTab === "output" && selectedSpan.output_data ? (
          isLlm ? (
            <LlmOutputView data={selectedSpan.output_data} />
          ) : (
            <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">
              {tryFormatJson(selectedSpan.output_data)}
            </pre>
          )
        ) : null}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-[#b0aea5]">
        {label}
      </span>
      <span className="text-xs text-[#141413]">{children}</span>
    </div>
  );
}

function tryFormatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
