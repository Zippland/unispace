import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAgents,
  createAgent,
  deleteAgent,
  type AgentConfig,
} from "../utils/adminApi";

export default function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<AgentConfig | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  async function handleCreate() {
    const agent = await createAgent({
      name: "New Agent",
      description: "",
      system_prompt: "",
      model: "claude-sonnet-4-5",
      skills: [],
      bu: "",
      author: "",
    });
    navigate(`/admin/agents/${agent.id}`);
  }

  async function handleDelete(id: string) {
    await deleteAgent(id);
    setDeleting(null);
    refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e6dc] bg-[#faf9f5] px-6 py-4">
        <div>
          <h1
            className="text-lg font-semibold text-[#141413]"
          >
            Agents
          </h1>
          <p className="mt-0.5 text-xs text-[#141413]/50">
            Configure agents for deployment. Each agent serves multiple users in isolated sandboxes.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a28]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Agent
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#b0aea5]">Loading...</p>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[#b0aea5]">
            <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            <p className="text-sm">No agents configured</p>
            <p className="mt-1 text-xs">Click "New Agent" to create your first agent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => navigate(`/admin/agents/${agent.id}`)}
                className="cursor-pointer rounded-xl border border-[#e8e6dc] bg-white p-5 transition hover:border-[#b0aea5] hover:shadow-[0_4px_20px_rgba(20,20,19,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#141413]">
                        {agent.name}
                      </h3>
                      <span className="rounded-full bg-[#141413]/[0.06] px-2 py-0.5 text-[10px] text-[#6b6963]">
                        {agent.model}
                      </span>
                      {agent.published && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Published
                        </span>
                      )}
                      {agent.api?.enabled && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          API
                        </span>
                      )}
                      {agent.bu && (
                        <span className="rounded-full bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-medium text-[#d97757]">
                          {agent.bu}
                        </span>
                      )}
                    </div>
                    {agent.description && (
                      <p className="mt-1.5 line-clamp-1 text-xs text-[#6b6963]">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(agent);
                    }}
                    className="shrink-0 rounded-lg border border-[#e8e6dc] px-3 py-1.5 text-xs text-[#b0aea5] transition hover:border-red-200 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-4 text-[10px] text-[#b0aea5]">
                  {agent.author && <span>by {agent.author}</span>}
                  <span>
                    {agent.environment?.runtimes?.join(", ") || "no runtimes"}
                  </span>
                  <span>
                    {agent.api?.keys?.filter((k) => !k.revoked).length || 0} active keys
                  </span>
                  <span>
                    Updated{" "}
                    {new Date(agent.updated_at).toLocaleDateString("zh-CN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleting && (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#141413]/25 backdrop-blur-sm"
            onClick={() => setDeleting(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(20,20,19,0.15)]">
            <h3
              className="text-[15px] font-semibold text-[#141413]"
              >
              Delete Agent
            </h3>
            <p className="mt-2 text-sm text-[#6b6963]">
              Permanently delete <strong>{deleting.name}</strong>? All API keys will be revoked.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-sm text-[#6b6963] transition hover:bg-[#faf9f5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleting.id)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
