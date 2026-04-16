import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAgents, fetchTraces, type AgentConfig } from "../utils/adminApi";
import { useAdminContext } from "../stores/adminContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const activeBu = useAdminContext((s) => s.activeBu);
  const currentBu = useAdminContext((s) => s.currentBu);
  const buLabel = currentBu().label;
  const [allAgents, setAllAgents] = useState<AgentConfig[]>([]);
  const [traceStats, setTraceStats] = useState<{ total: number; errors: number; traces: any[] }>({ total: 0, errors: 0, traces: [] });
  const [loading, setLoading] = useState(true);

  const agents = useMemo(
    () => allAgents.filter((a) => !a.bu || a.bu === activeBu),
    [allAgents, activeBu],
  );

  useEffect(() => {
    Promise.all([
      fetchAgents().catch(() => [] as AgentConfig[]),
      fetchTraces({ limit: 50 }).catch(() => ({ traces: [], total: 0 })),
    ]).then(([agentsData, tracesData]) => {
      setAllAgents(agentsData);
      const errors = tracesData.traces.filter((t: any) => t.status === "error").length;
      setTraceStats({ total: tracesData.total, errors, traces: tracesData.traces });
      setLoading(false);
    });
  }, []);

  const recentTraces = traceStats.traces.slice(0, 5);
  const errorRate = traceStats.total > 0 ? ((traceStats.errors / traceStats.total) * 100).toFixed(1) + "%" : "0%";

  const stats = [
    { label: "Agents", value: agents.length.toString(), color: "#141413" },
    { label: "Total Traces", value: traceStats.total.toString(), color: "#6a9bcc" },
    { label: "Error Rate", value: errorRate, color: traceStats.errors > 0 ? "#d97757" : "#788c5d" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <h1 className="text-lg font-semibold text-[#141413]">
          Dashboard <span className="text-[#b0aea5]">/</span> {buLabel}
        </h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">
          Platform overview
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#b0aea5]">Loading...</p>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Agents list */}
              <div className="col-span-2 rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">Agents</h2>
                <div className="mt-4 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8e6dc] text-[10px] uppercase tracking-wider text-[#b0aea5]">
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 font-medium">BU</th>
                        <th className="pb-2 text-right font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.slice(0, 8).map((agent) => (
                        <tr
                          key={agent.id}
                          onClick={() => navigate(`/admin/agents/${agent.id}`)}
                          className="cursor-pointer border-b border-[#e8e6dc]/50 transition hover:bg-[#faf9f5]"
                        >
                          <td className="py-2.5 font-medium text-[#141413]">{agent.name}</td>
                          <td className="py-2.5 text-[#b0aea5]">{agent.bu || "\u2014"}</td>
                          <td className="py-2.5 text-right text-[#b0aea5]">
                            {new Date(agent.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {agents.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-[#b0aea5]">No agents yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Traces */}
              <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">Recent Traces</h2>
                <div className="mt-4 space-y-0">
                  {recentTraces.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#b0aea5]">No traces yet</p>
                  ) : (
                    recentTraces.map((trace: any, i: number) => (
                      <div key={trace.id || i} className="flex gap-3 py-2.5">
                        <div className="flex flex-col items-center">
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: trace.status === "error" ? "#d97757" : "#788c5d" }}
                          />
                          {i < recentTraces.length - 1 && <span className="w-px flex-1 bg-[#e8e6dc]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs text-[#141413]">
                            {trace.query_preview || trace.agent_name || "Trace"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#b0aea5]">
                            {trace.status} &middot; {trace.duration_ms ? `${trace.duration_ms}ms` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
