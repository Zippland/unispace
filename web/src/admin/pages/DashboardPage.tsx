import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAgents, type AgentConfig } from "../utils/adminApi";
import { useAdminContext } from "../stores/adminContext";
import StatusBadge, { type AgentStatus } from "../components/StatusBadge";

const MOCK_ACTIVITY = [
  { time: "14:32", text: "Finance Bot deployed to production", color: "#788c5d" },
  { time: "13:15", text: "HR Agent API key generated", color: "#6a9bcc" },
  { time: "11:48", text: "Marketing Agent published to Gallery", color: "#d97757" },
  { time: "10:22", text: "Data Analysis Bot system prompt updated", color: "#6a9bcc" },
  { time: "09:05", text: "Customer Support Agent added MCP server", color: "#788c5d" },
  { time: "Yesterday", text: "Engineering Bot runtimes updated", color: "#b0aea5" },
  { time: "Yesterday", text: "Sales Agent dispatch configured", color: "#d97757" },
];

function mockAgentStats(agent: AgentConfig, i: number) {
  const calls = [3842, 2916, 2105, 1573, 988, 724, 412, 187][i % 8];
  const users = [89, 64, 52, 41, 28, 19, 11, 5][i % 8];
  return { calls, users };
}

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

  const stats = [
    { label: "Deployed Agents", value: agents.filter((a) => a.published).length.toString(), color: "#141413" },
    { label: "API Calls (7d)", value: "12,847", color: "#6a9bcc" },
    { label: "Active Users", value: "342", color: "#788c5d" },
    { label: "Error Rate", value: "0.8%", color: "#d97757" },
    { label: "Est. Cost (MTD)", value: "$4,218", color: "#141413" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <h1 className="text-lg font-semibold text-[#141413]">
          Dashboard <span className="text-[#b0aea5]">--</span> {buLabel}
        </h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">
          Platform overview and key metrics.
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
                <div
                  key={s.label}
                  className="rounded-xl border border-[#e8e6dc] bg-white p-5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">
                    {s.label}
                  </p>
                  <p
                    className="mt-1 text-2xl font-semibold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Top Agents */}
              <div className="col-span-2 rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">
                  Top Agents
                </h2>
                <div className="mt-4 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8e6dc] text-[10px] uppercase tracking-wider text-[#b0aea5]">
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 font-medium">BU</th>
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
                            <td className="py-2.5 font-medium text-[#141413]">
                              {agent.name}
                            </td>
                            <td className="py-2.5 text-[#6b6963]">
                              {agent.bu || "--"}
                            </td>
                            <td className="py-2.5 text-right text-[#141413]">
                              {m.calls.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right text-[#141413]">
                              {m.users}
                            </td>
                            <td className="py-2.5 text-right">
                              {agent.published ? (
                                <span className="inline-block rounded-full bg-[#788c5d]/10 px-2 py-0.5 text-[10px] font-medium text-[#788c5d]">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-block rounded-full bg-[#b0aea5]/10 px-2 py-0.5 text-[10px] font-medium text-[#b0aea5]">
                                  Draft
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {agents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#b0aea5]">
                            No agents yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
                <h2 className="text-sm font-semibold text-[#141413]">
                  Recent Activity
                </h2>
                <div className="mt-4 space-y-0">
                  {MOCK_ACTIVITY.map((evt, i) => (
                    <div key={i} className="flex gap-3 py-2.5">
                      <div className="flex flex-col items-center">
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: evt.color }}
                        />
                        {i < MOCK_ACTIVITY.length - 1 && (
                          <span className="w-px flex-1 bg-[#e8e6dc]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#141413]">{evt.text}</p>
                        <p className="mt-0.5 text-[10px] text-[#b0aea5]">
                          {evt.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Agent Quality */}
            <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#141413]">
                Agent Quality
              </h2>
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
                    {QUALITY_DATA.map((q) => (
                      <tr
                        key={q.agent}
                        className="border-b border-[#e8e6dc]/50"
                      >
                        <td className="py-2.5 font-medium text-[#141413]">
                          {q.agent}
                        </td>
                        <td className="py-2.5 text-right" style={{ color: satisfactionColor(q.satisfaction) }}>
                          {q.satisfaction ?? "\u2014"}
                        </td>
                        <td className="py-2.5 text-right text-[#141413]">
                          {q.avgTurns ?? "\u2014"}
                        </td>
                        <td className="py-2.5 text-right text-[#141413]">
                          {q.errorRate ?? "\u2014"}
                        </td>
                        <td className="py-2.5 text-right">
                          <StatusBadge status={q.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BU Budget */}
            <div className="rounded-xl border border-[#e8e6dc] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#141413]">
                BU Budget
              </h2>
              <div className="mt-4 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e8e6dc] text-[10px] uppercase tracking-wider text-[#b0aea5]">
                      <th className="pb-2 font-medium">BU</th>
                      <th className="pb-2 text-right font-medium">Budget</th>
                      <th className="pb-2 text-right font-medium">Used</th>
                      <th className="pb-2 text-right font-medium">Remaining</th>
                      <th className="pb-2 w-32 font-medium">Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUDGET_DATA.map((b) => {
                      const pct = Math.round((b.used / b.budget) * 100);
                      const barColor = pct >= 90 ? "#dc2626" : pct >= 70 ? "#d97757" : "#788c5d";
                      return (
                        <tr
                          key={b.bu}
                          className="border-b border-[#e8e6dc]/50"
                        >
                          <td className="py-2.5 font-medium text-[#141413]">
                            {b.bu}
                          </td>
                          <td className="py-2.5 text-right text-[#141413]">
                            ${b.budget.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right text-[#141413]">
                            ${b.used.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right text-[#141413]">
                            ${(b.budget - b.used).toLocaleString()}
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-[#e8e6dc]">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                                />
                              </div>
                              <span className="w-8 text-right text-[10px] text-[#6b6963]">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quality mock data ───────────────────────────────────────

const QUALITY_DATA: {
  agent: string;
  satisfaction: string | null;
  avgTurns: string | null;
  errorRate: string | null;
  status: AgentStatus;
}[] = [
  { agent: "Finance Bot", satisfaction: "94%", avgTurns: "3.2", errorRate: "0.6%", status: "live" },
  { agent: "HR Assistant", satisfaction: "91%", avgTurns: "4.1", errorRate: "1.2%", status: "live" },
  { agent: "Code Reviewer", satisfaction: "88%", avgTurns: "2.8", errorRate: "2.1%", status: "review" },
  { agent: "Marketing Agent", satisfaction: "96%", avgTurns: "3.5", errorRate: "0.3%", status: "approved" },
  { agent: "Contract Analyzer", satisfaction: null, avgTurns: null, errorRate: null, status: "draft" },
];

function satisfactionColor(val: string | null): string {
  if (!val) return "#b0aea5";
  const num = parseInt(val);
  if (num >= 90) return "#788c5d";
  if (num >= 80) return "#d97757";
  return "#dc2626";
}


// ── Budget mock data ────────────────────────────────────────

const BUDGET_DATA = [
  { bu: "Finance", budget: 3000, used: 1847 },
  { bu: "HR", budget: 2000, used: 921 },
  { bu: "Engineering", budget: 5000, used: 1103 },
  { bu: "Marketing", budget: 1500, used: 347 },
];
