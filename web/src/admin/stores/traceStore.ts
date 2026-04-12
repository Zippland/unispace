import { create } from "zustand";
import type { Span, TraceListItem, TraceOverview, SpanType, SpanStatus } from "../types/trace";
import * as api from "../utils/adminApi";

// ── Mock data — used when the API returns empty ─────────────

function mockId() {
  return "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14);
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

const MOCK_TRACES: TraceListItem[] = [
  {
    id: "t-001", trace_id: "t-001", project: "finance-bot", agent_name: "Finance Bot",
    query_preview: "帮我分析 Q1 营收数据，对比去年同期增长率",
    status: "success", start_time: hoursAgo(0.5), created_at: hoursAgo(0.5),
    duration_ms: 12340, span_count: 8, metadata: {},
  },
  {
    id: "t-002", trace_id: "t-002", project: "hr-assistant", agent_name: "HR Assistant",
    query_preview: "查询北京办公室近三个月的离职率趋势",
    status: "success", start_time: hoursAgo(1.2), created_at: hoursAgo(1.2),
    duration_ms: 8920, span_count: 5, metadata: {},
  },
  {
    id: "t-003", trace_id: "t-003", project: "finance-bot", agent_name: "Finance Bot",
    query_preview: "生成本月部门预算使用报告，导出为 Excel",
    status: "success", start_time: hoursAgo(2.1), created_at: hoursAgo(2.1),
    duration_ms: 34200, span_count: 14, metadata: {},
  },
  {
    id: "t-004", trace_id: "t-004", project: "code-reviewer", agent_name: "Code Reviewer",
    query_preview: "Review the authentication middleware changes in PR #1247",
    status: "error", start_time: hoursAgo(3.4), created_at: hoursAgo(3.4),
    duration_ms: 5100, span_count: 3, error: "Context window exceeded",
    metadata: {},
  },
  {
    id: "t-005", trace_id: "t-005", project: "marketing-agent", agent_name: "Marketing Agent",
    query_preview: "根据用户画像数据，生成 A/B 测试方案的推荐文案",
    status: "success", start_time: hoursAgo(4.8), created_at: hoursAgo(4.8),
    duration_ms: 18700, span_count: 11, metadata: {},
  },
  {
    id: "t-006", trace_id: "t-006", project: "finance-bot", agent_name: "Finance Bot",
    query_preview: "对比三个供应商的报价单，给出采购建议",
    status: "success", start_time: hoursAgo(6.0), created_at: hoursAgo(6.0),
    duration_ms: 22100, span_count: 9, metadata: {},
  },
  {
    id: "t-007", trace_id: "t-007", project: "hr-assistant", agent_name: "HR Assistant",
    query_preview: "帮我草拟一份高级工程师的 JD，参考现有团队能力模型",
    status: "success", start_time: hoursAgo(8.3), created_at: hoursAgo(8.3),
    duration_ms: 15300, span_count: 7, metadata: {},
  },
  {
    id: "t-008", trace_id: "t-008", project: "code-reviewer", agent_name: "Code Reviewer",
    query_preview: "Analyze the database migration script for potential data loss risks",
    status: "success", start_time: hoursAgo(10.5), created_at: hoursAgo(10.5),
    duration_ms: 9800, span_count: 6, metadata: {},
  },
  {
    id: "t-009", trace_id: "t-009", project: "marketing-agent", agent_name: "Marketing Agent",
    query_preview: "整理上周各渠道投放数据，计算 ROI 并标注异常渠道",
    status: "error", start_time: hoursAgo(12.0), created_at: hoursAgo(12.0),
    duration_ms: 3200, span_count: 2, error: "Tool execution timeout: data_fetch",
    metadata: {},
  },
  {
    id: "t-010", trace_id: "t-010", project: "finance-bot", agent_name: "Finance Bot",
    query_preview: "将合同条款与公司标准模板进行逐条对比，标记差异项",
    status: "success", start_time: hoursAgo(14.7), created_at: hoursAgo(14.7),
    duration_ms: 41200, span_count: 18, metadata: {},
  },
  {
    id: "t-011", trace_id: "t-011", project: "hr-assistant", agent_name: "HR Assistant",
    query_preview: "统计本季度各部门培训完成率，生成达标/未达标清单",
    status: "success", start_time: hoursAgo(18.2), created_at: hoursAgo(18.2),
    duration_ms: 11400, span_count: 6, metadata: {},
  },
  {
    id: "t-012", trace_id: "t-012", project: "code-reviewer", agent_name: "Code Reviewer",
    query_preview: "Check the new caching layer implementation for race conditions",
    status: "success", start_time: hoursAgo(22.0), created_at: hoursAgo(22.0),
    duration_ms: 7600, span_count: 5, metadata: {},
  },
];

function buildMockOverview(traceId: string): TraceOverview {
  const trace = MOCK_TRACES.find((t) => t.trace_id === traceId);
  if (!trace) {
    return {
      root: {
        id: mockId(), trace_id: traceId, parent_id: null, name: "agent_turn",
        span_type: "root", status: "success", start_time: hoursAgo(1),
        duration_ms: 10000, metadata: {}, children_count: 3,
      },
      children: [],
    };
  }

  const rootId = mockId();
  const start = new Date(trace.start_time).getTime();
  const root: Span = {
    id: rootId, trace_id: traceId, parent_id: null, name: "agent_turn",
    span_type: "root", status: trace.status, start_time: trace.start_time,
    duration_ms: trace.duration_ms, metadata: { project: trace.project },
    error: trace.error, children_count: 0,
  };

  const children: Span[] = [];

  // Generate realistic span sequence: llm → tool → llm → tool → llm
  let cursor = 0;
  const totalDur = trace.duration_ms;
  const steps = Math.max(2, Math.floor(trace.span_count / 2));

  for (let i = 0; i < steps; i++) {
    const isLast = i === steps - 1;
    // LLM call
    const llmDur = Math.floor(totalDur * (0.15 + Math.random() * 0.1));
    children.push({
      id: mockId(), trace_id: traceId, parent_id: rootId, name: "llm_response",
      span_type: "llm_call", status: "success",
      start_time: new Date(start + cursor).toISOString(),
      duration_ms: llmDur, children_count: 0, metadata: {},
      output_data: JSON.stringify({
        text: i === 0
          ? "Let me analyze the data you've provided..."
          : isLast
            ? "Based on my analysis, here are the key findings..."
            : "I'll use the data processing tool to compute the results.",
        thinking: i === 0 ? "The user wants a detailed analysis. I should first read the data, then compute metrics, and finally format the output." : undefined,
      }),
    });
    cursor += llmDur;
    root.children_count++;

    // Tool call (skip for last iteration)
    if (!isLast) {
      const toolNames = ["Read", "Bash", "Write", "Grep", "WebSearch"];
      const toolName = toolNames[i % toolNames.length];
      const toolDur = Math.floor(totalDur * (0.05 + Math.random() * 0.15));
      const isToolError = trace.status === "error" && i === steps - 2;
      children.push({
        id: mockId(), trace_id: traceId, parent_id: rootId, name: toolName,
        span_type: "tool_call",
        status: isToolError ? "error" : "success",
        start_time: new Date(start + cursor).toISOString(),
        duration_ms: toolDur, children_count: 0,
        metadata: {},
        input_data: JSON.stringify(
          toolName === "Bash"
            ? { command: "python3 analyze.py --input data.csv" }
            : toolName === "Read"
              ? { file_path: "/workspace/data/Q1_revenue.csv" }
              : toolName === "Write"
                ? { file_path: "/workspace/output/report.xlsx", content: "..." }
                : toolName === "Grep"
                  ? { pattern: "revenue.*2024", path: "/workspace/data/" }
                  : { query: "Q1 2024 industry benchmark" },
        ),
        output_data: isToolError
          ? trace.error || "Execution failed"
          : "Operation completed successfully. 247 rows processed.",
        error: isToolError ? trace.error : undefined,
      });
      cursor += toolDur;
      root.children_count++;
    }
  }

  return { root, children };
}

// ── Store ────────────────────────────────────────────────────

interface TraceState {
  // List view
  recentTraces: TraceListItem[];
  recentTotal: number;
  recentSearch: string;
  recentHasMore: boolean;

  // Detail view
  traceOverview: TraceOverview | null;
  selectedSpan: Span | null;
  childrenMap: Record<string, Span[]>;
  expandedSpans: Set<string>;

  // Filters (applied to detail view's children)
  typeFilter: SpanType | "all";
  statusFilter: SpanStatus | "all";
  nameSearch: string;

  // Loading states
  isLoading: boolean;
  isDetailLoading: boolean;
  errorMessage: string;

  // Actions
  loadRecent: (params: {
    limit: number;
    offset: number;
    search?: string;
  }) => Promise<void>;
  searchByLogId: (logid: string) => Promise<void>;
  selectSpan: (traceId: string, spanId: string) => Promise<void>;
  clearSelectedSpan: () => void;
  toggleExpand: (traceId: string, spanId: string) => Promise<void>;
  setTypeFilter: (f: SpanType | "all") => void;
  setStatusFilter: (f: SpanStatus | "all") => void;
  setNameSearch: (s: string) => void;
  clearSearch: () => void;
}

export const useTraceStore = create<TraceState>((set, get) => ({
  recentTraces: [],
  recentTotal: 0,
  recentSearch: "",
  recentHasMore: false,
  traceOverview: null,
  selectedSpan: null,
  childrenMap: {},
  expandedSpans: new Set(),
  typeFilter: "all",
  statusFilter: "all",
  nameSearch: "",
  isLoading: false,
  isDetailLoading: false,
  errorMessage: "",

  loadRecent: async ({ limit, offset, search }) => {
    set({ isLoading: true, errorMessage: "", recentSearch: search || "" });
    try {
      const data = await api.fetchTraces({ limit, offset, search });
      // Use mock data when API returns empty
      const traces = data.traces.length > 0 ? data.traces : MOCK_TRACES;
      const total = data.total > 0 ? data.total : MOCK_TRACES.length;
      // Apply search filter to mock data
      const filtered = data.traces.length > 0 || !search
        ? traces
        : traces.filter((t) => {
            const needle = search.toLowerCase();
            return (
              t.query_preview.toLowerCase().includes(needle) ||
              t.project.toLowerCase().includes(needle) ||
              (t.agent_name || "").toLowerCase().includes(needle)
            );
          });
      set({
        recentTraces: filtered.slice(offset, offset + limit),
        recentTotal: data.traces.length > 0 ? total : filtered.length,
        recentHasMore: offset + limit < (data.traces.length > 0 ? total : filtered.length),
        isLoading: false,
        traceOverview: null,
        selectedSpan: null,
      });
    } catch (e: any) {
      // Fallback to mock on network error too
      set({
        recentTraces: MOCK_TRACES.slice(offset, offset + limit),
        recentTotal: MOCK_TRACES.length,
        recentHasMore: offset + limit < MOCK_TRACES.length,
        isLoading: false,
        traceOverview: null,
        selectedSpan: null,
      });
    }
  },

  searchByLogId: async (logid) => {
    set({
      isLoading: true,
      errorMessage: "",
      selectedSpan: null,
      expandedSpans: new Set(),
      childrenMap: {},
    });
    try {
      const data = await api.fetchTraceDetail(logid);
      set({ traceOverview: data, isLoading: false });
    } catch {
      // Fallback to mock detail
      const overview = buildMockOverview(logid);
      if (MOCK_TRACES.some((t) => t.trace_id === logid)) {
        set({ traceOverview: overview, isLoading: false });
      } else {
        set({
          isLoading: false,
          errorMessage: "Trace not found",
          traceOverview: null,
        });
      }
    }
  },

  selectSpan: async (_traceId, spanId) => {
    // Check in current traceOverview first (works for both real and mock)
    const overview = get().traceOverview;
    if (overview) {
      const span =
        overview.root.id === spanId
          ? overview.root
          : overview.children.find((s) => s.id === spanId);
      if (span) {
        set({ selectedSpan: span, isDetailLoading: false });
        return;
      }
    }
    set({ isDetailLoading: true });
    try {
      const span = await api.fetchSpanDetail(_traceId, spanId);
      set({ selectedSpan: span, isDetailLoading: false });
    } catch {
      set({ isDetailLoading: false });
    }
  },

  clearSelectedSpan: () => set({ selectedSpan: null }),

  toggleExpand: async (traceId, spanId) => {
    const { expandedSpans, childrenMap } = get();
    const next = new Set(expandedSpans);

    if (next.has(spanId)) {
      next.delete(spanId);
      set({ expandedSpans: next });
      return;
    }

    next.add(spanId);
    set({ expandedSpans: next });

    if (!childrenMap[spanId]) {
      try {
        const children = await api.fetchSpanChildren(traceId, spanId);
        set({
          childrenMap: { ...get().childrenMap, [spanId]: children },
        });
      } catch {
        // ignore
      }
    }
  },

  setTypeFilter: (f) => set({ typeFilter: f }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setNameSearch: (s) => set({ nameSearch: s }),
  clearSearch: () =>
    set({
      traceOverview: null,
      selectedSpan: null,
      expandedSpans: new Set(),
      childrenMap: {},
      typeFilter: "all",
      statusFilter: "all",
      nameSearch: "",
    }),
}));
