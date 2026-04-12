import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAgents, type AgentConfig } from "../utils/adminApi";
import { useAdminContext } from "../stores/adminContext";
import StatusBadge, { type AgentStatus } from "../components/StatusBadge";

function mockAgentStats(_agent: AgentConfig, i: number) {
  const calls = [3842, 2916, 2105, 1573, 988, 724, 412, 187][i % 8];
  const users = [89, 64, 52, 41, 28, 19, 11, 5][i % 8];
  const satisfaction = [94, 91, 88, 96, 85, 92, 78, 90][i % 8];
  const avgTurns = [3.2, 4.1, 2.8, 3.5, 5.0, 2.4, 3.8, 4.5][i % 8];
  const errorRate = [0.6, 1.2, 2.1, 0.3, 1.8, 0.5, 3.2, 0.9][i % 8];
  return { calls, users, satisfaction, avgTurns, errorRate };
}

// BU-specific mock data
const BU_METRICS: Record<string, { apiCalls: string; activeUsers: string; errorRate: string; cost: string; budget: number; used: number }> = {
  finance:     { apiCalls: "5,218",  activeUsers: "127", errorRate: "0.6%", cost: "$1,847", budget: 3000, used: 1847 },
  hr:          { apiCalls: "3,421",  activeUsers: "89",  errorRate: "1.1%", cost: "$921",   budget: 2000, used: 921 },
  engineering: { apiCalls: "2,956",  activeUsers: "64",  errorRate: "1.8%", cost: "$1,103", budget: 5000, used: 1103 },
  marketing:   { apiCalls: "1,252",  activeUsers: "62",  errorRate: "0.3%", cost: "$347",   budget: 1500, used: 347 },
};

const BU_ACTIVITY: Record<string, Array<{ time: string; text: string; color: string }>> = {
  finance: [
    { time: "14:32", text: "Finance Bot deployed to production", color: "#788c5d" },
    { time: "11:48", text: "Contract Analyzer submitted for review", color: "#d97757" },
    { time: "10:22", text: "Budget Report Agent prompt updated", color: "#6a9bcc" },
    { time: "09:05", text: "Finance Bot API key regenerated", color: "#788c5d" },
    { time: "Yesterday", text: "Finance Bot v2.1 approved", color: "#6a9bcc" },
  ],
  hr: [
    { time: "13:15", text: "HR Assistant API key generated", color: "#6a9bcc" },
    { time: "10:30", text: "Recruitment Screener submitted for review", color: "#d97757" },
    { time: "Yesterday", text: "HR Assistant dispatch configured", color: "#788c5d" },
    { time: "Yesterday", text: "Customer Support Agent rejected", color: "#d97757" },
  ],
  engineering: [
    { time: "09:05", text: "Code Quality Gate submitted for review", color: "#d97757" },
    { time: "Yesterday", text: "Code Reviewer runtimes updated", color: "#b0aea5" },
    { time: "Yesterday", text: "CI Pipeline Agent MCP server added", color: "#6a9bcc" },
  ],
  marketing: [
    { time: "11:48", text: "Marketing Agent published to Gallery", color: "#788c5d" },
    { time: "Yesterday", text: "Marketing Copywriter approved", color: "#6a9bcc" },
    { time: "2 days ago", text: "Campaign Analyzer skills updated", color: "#d97757" },
  ],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const activeBu = useAdminContext((s) => s.activeBu);
  const currentBu = useAdminContext((s) => s.currentBu);
  const buLabel = currentBu().label;
  const [allAgents, setAllAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const agents = useMemo(
    () => allAgents.filter((a) => !a.bu || a.bu === activeBu),
    [allAgents, activeBu],
  );

  useEffect(() => {
    fetchAgents()
      .then(setAllAgents)
      .catch(() => setAllAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const metrics = BU_METRICS[activeBu] || BU_METRICS.finance;
  const activity = BU_ACTIVITY[activeBu] || [];

  const stats = [
    { label: "Deployed Agents", value: agents.filter((a) => a.status === "live").length.toString(), color: "#141413" },
    { label: "API Calls (7d)", value: metrics.apiCalls, color: "#6a9bcc" },
    { label: "Active Users", value: metrics.activeUsers, color: "#788c5d" },
    { label: "Error Rate", value: metrics.errorRate, color: "#d97757" },
    { label: "Est. Cost (MTD)", value: metrics.cost, color: "#141413" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <h1 className="text-lg font-semibold text-[#141413]">
          Dashboard <span className="text-[#b0aea5]">/</span> {buLabel}
        </h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">
          Platform overview and key metrics
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#b0aea5]">Loading...</p>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-5 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Top Agents */}
              <div className="col-span-2 rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">Agents</h2>
                <div className="mt-4 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8e6dc] text-[10px] uppercase tracking-wider text-[#b0aea5]">
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 text-right font-medium">API Calls</th>
                        <th className="pb-2 text-right font-medium">Users</th>
                        <th className="pb-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.slice(0, 8).map((agent, i) => {
                        const m = mockAgentStats(agent, i);
                        return (
                          <tr
                            key={agent.id}
                            onClick={() => navigate(`/admin/agents/${agent.id}`)}
                            className="cursor-pointer border-b border-[#e8e6dc]/50 transition hover:bg-[#faf9f5]"
                          >
                            <td className="py-2.5 font-medium text-[#141413]">{agent.name}</td>
                            <td className="py-2.5 text-right text-[#141413]">{m.calls.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-[#141413]">{m.users}</td>
                            <td className="py-2.5 text-right">
                              <StatusBadge status={(agent.status || "draft") as AgentStatus} />
                            </td>
                          </tr>
                        );
                      })}
                      {agents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#b0aea5]">No agents yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">Recent Activity</h2>
                <div className="mt-4 space-y-0">
                  {activity.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#b0aea5]">No recent activity</p>
                  ) : (
                    activity.map((evt, i) => (
                      <div key={i} className="flex gap-3 py-2.5">
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: evt.color }} />
                          {i < activity.length - 1 && <span className="w-px flex-1 bg-[#e8e6dc]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#141413]">{evt.text}</p>
                          <p className="mt-0.5 text-[10px] text-[#b0aea5]">{evt.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Agent Quality — derived from real agent list */}
            {agents.length > 0 && (
              <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">Agent Quality</h2>
                <div className="mt-4 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8e6dc] text-[10px] uppercase tracking-wider text-[#b0aea5]">
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 text-right font-medium">Satisfaction</th>
                        <th className="pb-2 text-right font-medium">Avg Turns</th>
                        <th className="pb-2 text-right font-medium">Error Rate</th>
                        <th className="pb-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.slice(0, 6).map((agent, i) => {
                        const m = mockAgentStats(agent, i);
                        const hasData = agent.status === "live" || agent.status === "approved";
                        return (
                          <tr key={agent.id} className="border-b border-[#e8e6dc]/50">
                            <td className="py-2.5 font-medium text-[#141413]">{agent.name}</td>
                            <td className="py-2.5 text-right" style={{ color: hasData ? satisfactionColor(m.satisfaction) : "#b0aea5" }}>
                              {hasData ? `${m.satisfaction}%` : "\u2014"}
                            </td>
                            <td className="py-2.5 text-right text-[#141413]">
                              {hasData ? m.avgTurns : "\u2014"}
                            </td>
                            <td className="py-2.5 text-right text-[#141413]">
                              {hasData ? `${m.errorRate}%` : "\u2014"}
                            </td>
                            <td className="py-2.5 text-right">
                              <StatusBadge status={(agent.status || "draft") as AgentStatus} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Budget — current BU only */}
            <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#141413]">Budget</h2>
              <div className="mt-4 flex items-end gap-8">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">Monthly Budget</p>
                  <p className="mt-1 text-2xl font-semibold text-[#141413]">${metrics.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">Used</p>
                  <p className="mt-1 text-2xl font-semibold text-[#141413]">${metrics.used.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">Remaining</p>
                  <p className="mt-1 text-2xl font-semibold text-[#788c5d]">${(metrics.budget - metrics.used).toLocaleString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">Usage</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-[#e8e6dc]">
                      {(() => {
                        const pct = Math.round((metrics.used / metrics.budget) * 100);
                        const color = pct >= 90 ? "#dc2626" : pct >= 70 ? "#d97757" : "#788c5d";
                        return <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />;
                      })()}
                    </div>
                    <span className="text-sm font-semibold text-[#141413]">
                      {Math.round((metrics.used / metrics.budget) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function satisfactionColor(val: number): string {
  if (val >= 90) return "#788c5d";
  if (val >= 80) return "#d97757";
  return "#dc2626";
}
