import { create } from "zustand";
import type { Span, TraceListItem, TraceOverview, SpanType, SpanStatus } from "../types/trace";
import * as api from "../utils/adminApi";

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
      set({
        recentTraces: data.traces,
        recentTotal: data.total,
        recentHasMore: offset + limit < data.total,
        isLoading: false,
        traceOverview: null,
        selectedSpan: null,
      });
    } catch (e: any) {
      set({
        isLoading: false,
        errorMessage: e.message || "Failed to load traces",
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
      set({
        traceOverview: data,
        isLoading: false,
      });
    } catch (e: any) {
      set({
        isLoading: false,
        errorMessage: e.message || "Trace not found",
        traceOverview: null,
      });
    }
  },

  selectSpan: async (traceId, spanId) => {
    set({ isDetailLoading: true });
    try {
      const span = await api.fetchSpanDetail(traceId, spanId);
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

    // Lazy-load children if not cached
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
