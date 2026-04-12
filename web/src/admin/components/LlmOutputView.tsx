import { useState } from "react";

interface Props {
  data: string;
}

/** Renders structured LLM output data. */
export default function LlmOutputView({ data }: Props) {
  let parsed: any = null;
  try {
    parsed = JSON.parse(data);
  } catch {
    // raw text
  }

  if (!parsed) {
    return <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">{data}</pre>;
  }

  return (
    <div className="space-y-3">
      {parsed.thinking && (
        <CollapsibleSection title="Thinking" defaultOpen={false}>
          <pre className="whitespace-pre-wrap text-xs text-purple-700/80">
            {parsed.thinking}
          </pre>
        </CollapsibleSection>
      )}

      {parsed.text && (
        <CollapsibleSection title="Response" defaultOpen>
          <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">
            {parsed.text}
          </pre>
        </CollapsibleSection>
      )}

      {parsed.tool_calls && Array.isArray(parsed.tool_calls) && (
        <CollapsibleSection title="Tool Calls" defaultOpen>
          {parsed.tool_calls.map((tc: any, i: number) => (
            <div
              key={i}
              className="mt-1 rounded border border-[#e8e6dc] bg-[#faf9f5] px-2 py-1.5"
            >
              <span className="text-[10px] font-semibold text-orange-600">
                {tc.name || tc.function?.name || "tool"}
              </span>
              <pre className="mt-1 whitespace-pre-wrap text-[10px] text-[#141413]/60">
                {JSON.stringify(tc.input || tc.function?.arguments, null, 2)}
              </pre>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Fallback: if no recognized fields, dump JSON */}
      {!parsed.text && !parsed.thinking && !parsed.tool_calls && (
        <pre className="whitespace-pre-wrap text-xs text-[#141413]/80">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium text-[#141413]/60 hover:text-[#141413]"
      >
        <span className="text-[10px]">{open ? "▼" : "▶"}</span>
        {title}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
