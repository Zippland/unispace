import { useState } from "react";

interface Props {
  data: string;
}

/** Renders structured LLM input data. Tries to parse as JSON first,
 *  falls back to raw text display. */
export default function LlmInputView({ data }: Props) {
  let parsed: any = null;
  try {
    parsed = JSON.parse(data);
  } catch {
    // raw text
  }

  if (!parsed) {
    return <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">{data}</pre>;
  }

  // If parsed is an array of messages (chat format)
  if (Array.isArray(parsed)) {
    return (
      <div className="space-y-2">
        {parsed.map((msg: any, i: number) => (
          <MessageCard key={i} message={msg} />
        ))}
      </div>
    );
  }

  // If parsed is an object with messages field
  if (parsed.messages && Array.isArray(parsed.messages)) {
    return (
      <div className="space-y-2">
        {parsed.messages.map((msg: any, i: number) => (
          <MessageCard key={i} message={msg} />
        ))}
      </div>
    );
  }

  // Generic JSON
  return (
    <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

function MessageCard({ message }: { message: any }) {
  const [expanded, setExpanded] = useState(false);
  const role = message.role || "unknown";
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content, null, 2);
  const isLong = content.length > 300;

  const roleColor =
    role === "system"
      ? "text-purple-600 bg-purple-50"
      : role === "assistant"
        ? "text-blue-600 bg-blue-50"
        : role === "user"
          ? "text-green-600 bg-green-50"
          : "text-[#6b6963] bg-[#faf9f5]";

  return (
    <div className="rounded-lg border border-[#e8e6dc] bg-white">
      <div className="flex items-center gap-2 border-b border-[#e8e6dc] px-3 py-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleColor}`}
        >
          {role}
        </span>
      </div>
      <div className="px-3 py-2">
        <pre
          className={`whitespace-pre-wrap text-xs text-[#141413]/80 ${
            !expanded && isLong ? "max-h-32 overflow-hidden" : ""
          }`}
        >
          {content}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[10px] text-[#d97757] hover:underline"
          >
            {expanded ? "Collapse" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
