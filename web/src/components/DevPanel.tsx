import { useState, useEffect } from "react";
import { useStore } from "../store";

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export default function DevPanel() {
  const { serverUrl } = useStore();
  const [tab, setTab] = useState<"prompt" | "tools">("prompt");
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${serverUrl}/api/debug/prompt`).then((r) => r.text()),
      fetch(`${serverUrl}/api/debug/tools`).then((r) => r.json()),
    ])
      .then(([p, t]) => {
        setPrompt(p);
        setTools(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverUrl]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-[#e8e6dc] bg-[#f0efe9] shrink-0">
        <button
          onClick={() => setTab("prompt")}
          className={`px-4 py-2 text-[13px] border-r border-[#e8e6dc] ${
            tab === "prompt"
              ? "bg-white text-[#141413] font-medium"
              : "text-[#b0aea5] hover:text-[#6b6963]"
          }`}
        >
          System Prompt
        </button>
        <button
          onClick={() => setTab("tools")}
          className={`px-4 py-2 text-[13px] border-r border-[#e8e6dc] ${
            tab === "tools"
              ? "bg-white text-[#141413] font-medium"
              : "text-[#b0aea5] hover:text-[#6b6963]"
          }`}
        >
          Tools ({tools.length})
        </button>
        <div className="flex-1" />
        <div className="flex items-center px-3">
          <span className="text-[11px] text-[#d97757] font-medium tracking-wide">DEV</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#b0aea5] text-sm">
          Loading...
        </div>
      ) : tab === "prompt" ? (
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Poppins',_Arial,_sans-serif] text-[13px] font-semibold text-[#b0aea5] uppercase tracking-widest">
                System Prompt
              </h2>
              <span className="text-[11px] text-[#b0aea5]">
                {prompt.length.toLocaleString()} chars
              </span>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-[#141413] bg-[#faf9f5] border border-[#e8e6dc] rounded-lg p-4 select-all">
              {prompt}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-3xl mx-auto space-y-4">
            <h2 className="font-['Poppins',_Arial,_sans-serif] text-[13px] font-semibold text-[#b0aea5] uppercase tracking-widest">
              Registered Tools
            </h2>
            {tools.map((t) => (
              <ToolCard key={t.name} tool={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolDef }) {
  const [expanded, setExpanded] = useState(false);
  const params = tool.parameters?.properties
    ? Object.entries(tool.parameters.properties)
    : [];
  const required = new Set(tool.parameters?.required || []);

  return (
    <div className="border border-[#e8e6dc] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#faf9f5] transition"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[14px] font-semibold text-[#141413]">
            {tool.name}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-[#b0aea5] transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[#e8e6dc]">
          {/* Description */}
          <div className="px-4 py-3 text-[13px] text-[#6b6963] whitespace-pre-wrap leading-relaxed">
            {tool.description}
          </div>

          {/* Parameters */}
          {params.length > 0 && (
            <div className="border-t border-[#e8e6dc] px-4 py-3">
              <div className="text-[11px] font-semibold text-[#b0aea5] uppercase tracking-wider mb-2">
                Parameters
              </div>
              <div className="space-y-1.5">
                {params.map(([name, schema]: [string, any]) => (
                  <div key={name} className="flex items-start gap-2 text-[13px]">
                    <code className="font-mono text-[#141413] shrink-0">
                      {name}
                      {required.has(name) && (
                        <span className="text-[#d97757] ml-0.5">*</span>
                      )}
                    </code>
                    <span className="text-[11px] text-[#b0aea5] bg-[#faf9f5] px-1.5 py-0.5 rounded shrink-0">
                      {schema.type}
                    </span>
                    {schema.description && (
                      <span className="text-[#6b6963]">{schema.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
