import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminContext } from "../stores/adminContext";
import { fetchAgents, updateAgent, type AgentConfig } from "../utils/adminApi";
import StatusBadge from "../components/StatusBadge";

// Mock review history — these are past decisions, static for demo.
interface ReviewRecord {
  agentName: string;
  bu: string;
  reviewer: string;
  decision: "approved" | "rejected";
  reviewDate: string;
  comment: string;
}

const REVIEW_HISTORY: ReviewRecord[] = [
  {
    agentName: "Finance Bot v2.1",
    bu: "finance",
    reviewer: "Zhang Ming",
    decision: "approved",
    reviewDate: "Yesterday",
    comment: "Prompt updated, risk assessment passed",
  },
  {
    agentName: "Customer Support Agent",
    bu: "hr",
    reviewer: "Zhang Ming",
    decision: "rejected",
    reviewDate: "2 days ago",
    comment: "System prompt lacks safety guardrails for PII handling",
  },
  {
    agentName: "Marketing Copywriter",
    bu: "marketing",
    reviewer: "Liu Yang",
    decision: "approved",
    reviewDate: "3 days ago",
    comment: "LGTM",
  },
];

export default function ReviewsPage() {
  const navigate = useNavigate();
  const activeBu = useAdminContext((s) => s.activeBu);
  const user = useAdminContext((s) => s.user);
  const [allAgents, setAllAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgents()
      .then(setAllAgents)
      .catch(() => setAllAgents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  // Real agents in "review" status, filtered by BU
  const pendingAgents = useMemo(
    () =>
      allAgents.filter(
        (a) => a.status === "review" && (!a.bu || a.bu === activeBu),
      ),
    [allAgents, activeBu],
  );

  // Recently approved/live agents (just transitioned)
  const recentlyApproved = useMemo(
    () =>
      allAgents
        .filter(
          (a) =>
            (a.status === "approved" || a.status === "live") &&
            (!a.bu || a.bu === activeBu),
        )
        .slice(0, 5),
    [allAgents, activeBu],
  );

  // Mock history filtered by BU
  const history = useMemo(
    () => REVIEW_HISTORY.filter((r) => r.bu === activeBu),
    [activeBu],
  );

  async function handleDecision(agentId: string, decision: "approved" | "draft") {
    setActing(agentId);
    try {
      await updateAgent(agentId, { status: decision });
      refresh();
    } catch {
      // ignore for demo
    }
    setActing(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <h1 className="text-lg font-semibold text-[#141413]">Reviews</h1>
        <p className="mt-0.5 text-xs text-[#141413]/50">
          Agents pending approval before going live
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Pending Review — real data from API */}
          <section>
            <h2 className="text-sm font-semibold text-[#141413]">
              Pending Review
              {pendingAgents.length > 0 && (
                <span className="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d97757] px-1.5 text-[10px] font-medium text-white">
                  {pendingAgents.length}
                </span>
              )}
            </h2>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="py-8 text-center text-xs text-[#b0aea5]">
                  Loading...
                </p>
              ) : pendingAgents.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#b0aea5]">
                  No agents pending review in this BU
                </p>
              ) : (
                pendingAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-xl border border-[#e8e6dc] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className="cursor-pointer text-sm font-semibold text-[#141413] hover:text-[#d97757]"
                            onClick={() => navigate(`/admin/agents/${agent.id}`)}
                          >
                            {agent.name}
                          </h3>
                          <StatusBadge status={agent.status} />
                        </div>
                        <p className="mt-1 text-xs text-[#6b6963]">
                          {agent.author ? `by ${agent.author}` : "No author"} — {agent.model}
                        </p>
                        {agent.system_prompt && (
                          <div className="mt-3 rounded-lg bg-[#faf9f5] px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-[#b0aea5]">
                              System Prompt Preview
                            </p>
                            <p className="mt-1 line-clamp-3 text-xs text-[#6b6963]">
                              {agent.system_prompt}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 flex gap-3 text-[10px] text-[#b0aea5]">
                          <span>{agent.skills?.length || 0} skills</span>
                          <span>{agent.subagents?.length || 0} subagents</span>
                          <span>{agent.commands?.length || 0} commands</span>
                          <span>{agent.environment?.mcp_servers?.length || 0} MCP servers</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleDecision(agent.id, "draft")}
                          disabled={acting === agent.id}
                          className="rounded-lg border border-red-300 px-4 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleDecision(agent.id, "approved")}
                          disabled={acting === agent.id}
                          className="rounded-lg bg-[#788c5d] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#6b7d52] disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recently approved agents (real data) */}
          {recentlyApproved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#141413]">
                Recently Approved
              </h2>
              <div className="mt-4 space-y-3">
                {recentlyApproved.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-xl border border-[#e8e6dc] bg-white p-5"
                  >
                    <div className="flex items-center gap-3">
                      <h3
                        className="cursor-pointer text-sm font-medium text-[#141413] hover:text-[#d97757]"
                        onClick={() => navigate(`/admin/agents/${agent.id}`)}
                      >
                        {agent.name}
                      </h3>
                      <StatusBadge status={agent.status} />
                      <span className="text-xs text-[#b0aea5]">
                        {agent.author || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historical reviews (mock — these represent past decisions) */}
          {history.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[#141413]">
                Review History
              </h2>
              <div className="mt-4 space-y-3">
                {history.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#e8e6dc] bg-white p-5"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-[#141413]">
                        {item.agentName}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.decision === "approved"
                            ? "bg-[#6a9bcc] text-white"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {item.decision}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#6b6963]">
                      Reviewed by {item.reviewer} — {item.reviewDate}
                    </p>
                    <p className="mt-1.5 rounded-lg bg-[#faf9f5] px-3 py-2 text-xs text-[#141413]">
                      "{item.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
