import { useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTraceStore } from "../stores/traceStore";
import TraceSearch from "../components/TraceSearch";
import SpanFilter from "../components/SpanFilter";
import TraceTimeline from "../components/TraceTimeline";
import SpanDetail from "../components/SpanDetail";
import { SPAN_STATUS_ERROR } from "../types/trace";

const PAGE_SIZE = 20;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildPagination(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (
    let p = Math.max(current - 1, 1);
    p <= Math.min(current + 1, total);
    p++
  ) {
    pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("ellipsis");
    items.push(sorted[i]);
  }
  return items;
}

export default function TracesPage() {
  const { logid } = useParams<{ logid?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const traceOverview = useTraceStore((s) => s.traceOverview);
  const recentTraces = useTraceStore((s) => s.recentTraces);
  const recentTotal = useTraceStore((s) => s.recentTotal);
  const recentSearch = useTraceStore((s) => s.recentSearch);
  const recentHasMore = useTraceStore((s) => s.recentHasMore);
  const isLoading = useTraceStore((s) => s.isLoading);
  const errorMessage = useTraceStore((s) => s.errorMessage);
  const selectedSpan = useTraceStore((s) => s.selectedSpan);
  const loadRecent = useTraceStore((s) => s.loadRecent);
  const searchByLogId = useTraceStore((s) => s.searchByLogId);

  const currentSearch = (searchParams.get("search") || "").trim();
  const currentPage = useMemo(() => {
    const raw = Number(searchParams.get("page") || "1");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(recentTotal / PAGE_SIZE)),
    [recentTotal],
  );
  const paginationItems = useMemo(
    () => buildPagination(Math.min(currentPage, totalPages), totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (logid) {
      searchByLogId(logid);
    } else {
      loadRecent({
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        search: currentSearch,
      });
    }
  }, [logid, currentPage, currentSearch]);

  const handleTraceClick = useCallback(
    (traceId: string) => {
      const qs = searchParams.toString();
      navigate(`/admin/traces/${traceId}${qs ? `?${qs}` : ""}`);
    },
    [navigate, searchParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      const params = new URLSearchParams(searchParams);
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
      const qs = params.toString();
      navigate(`/admin/traces${qs ? `?${qs}` : ""}`);
    },
    [navigate, searchParams, totalPages],
  );

  // Stats for detail view
  const stats = useMemo(() => {
    if (!traceOverview) return null;
    const children = traceOverview.children;
    const errorCount = children.filter(
      (c) => c.status === SPAN_STATUS_ERROR,
    ).length;
    return {
      spanCount: children.length,
      errorCount,
      duration: traceOverview.root.duration_ms,
    };
  }, [traceOverview]);

  return (
    <div className="flex h-full flex-col">
      {/* Search + filters */}
      <div className="space-y-3 border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <TraceSearch key={logid ? `logid:${logid}` : `search:${currentSearch}`} />
        {traceOverview && <SpanFilter />}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-4 border-b border-[#e8e6dc] bg-white px-6 py-3">
          <StatItem label="Duration" value={formatDuration(stats.duration)} />
          <StatItem label="Spans" value={String(stats.spanCount)} />
          <StatItem
            label="Errors"
            value={String(stats.errorCount)}
            highlight={stats.errorCount > 0}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#141413]/50">
            Loading...
          </div>
        ) : errorMessage ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          </div>
        ) : traceOverview ? (
          <>
            <div className="flex-1 overflow-auto p-4">
              <TraceTimeline />
            </div>
            {selectedSpan && <SpanDetail />}
          </>
        ) : (
          /* Recent traces list */
          <div className="flex-1 overflow-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                className="text-sm font-semibold text-[#141413]"
              >
                {recentSearch ? "Search Results" : "Recent Traces"}
              </h2>
              <p className="shrink-0 text-xs text-[#141413]/45">
                {recentTotal} total
                {recentSearch ? ` · "${recentSearch}"` : ""}
              </p>
            </div>

            {recentTraces.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-[#b0aea5]">
                <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                <p className="text-sm">
                  {recentSearch ? "No traces match your search" : "No traces yet"}
                </p>
                <p className="mt-1 text-xs">
                  {recentSearch
                    ? "Try a different keyword"
                    : "Send a message in any project to generate traces"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {recentTraces.map((trace) => (
                    <button
                      key={trace.id}
                      onClick={() => handleTraceClick(trace.trace_id)}
                      className="flex w-full items-center justify-between rounded-lg border border-[#e8e6dc] bg-white px-4 py-3 text-left transition-colors hover:border-[#d97757]/30 hover:bg-[#f7f6f2]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#141413]">
                          {trace.query_preview || trace.trace_id}
                        </p>
                        <p className="mt-0.5 text-xs text-[#141413]/50">
                          {trace.project}
                          {trace.agent_name ? ` · ${trace.agent_name}` : ""}
                          {" · "}
                          {formatTime(trace.created_at)}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[10px] text-[#141413]/30"
                          title={trace.trace_id}
                        >
                          {trace.trace_id}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3 text-xs text-[#141413]/50">
                        <span>{trace.span_count} spans</span>
                        <span>{formatDuration(trace.duration_ms)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            trace.status === SPAN_STATUS_ERROR
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {trace.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between rounded-lg border border-[#e8e6dc] bg-white px-4 py-3">
                    <p className="text-xs text-[#141413]/50">
                      Page {Math.min(currentPage, totalPages)} / {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-xs text-[#141413] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <div className="flex items-center gap-1">
                        {paginationItems.map((item, i) =>
                          item === "ellipsis" ? (
                            <span
                              key={`e${i}`}
                              className="px-1 text-xs text-[#141413]/35"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => handlePageChange(item)}
                              className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                item === currentPage
                                  ? "bg-[#141413] text-white"
                                  : "border border-[#e8e6dc] text-[#141413] hover:bg-[#f7f6f2]"
                              }`}
                            >
                              {item}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!recentHasMore}
                        className="rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-xs text-[#141413] transition hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#141413]/50">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-red-500" : "text-[#141413]"}`}
      >
        {value}
      </span>
    </div>
  );
}
