export type AgentStatus = "draft" | "review" | "approved" | "live" | "deprecated";

const STATUS_STYLES: Record<AgentStatus, { bg: string; text: string; border?: string; strike?: boolean }> = {
  draft:      { bg: "transparent", text: "#b0aea5", border: "#b0aea5" },
  review:     { bg: "#d97757", text: "#ffffff" },
  approved:   { bg: "#6a9bcc", text: "#ffffff" },
  live:       { bg: "#788c5d", text: "#ffffff" },
  deprecated: { bg: "#b0aea5", text: "#ffffff", strike: true },
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const c = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${c.strike ? "line-through" : ""}`}
      style={{
        backgroundColor: c.bg,
        color: c.text,
        border: c.border ? `1px solid ${c.border}` : undefined,
      }}
    >
      {status}
    </span>
  );
}
