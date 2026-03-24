import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, type FileTab } from "../store";
import { rawFileUrl } from "../api";

export default function FileViewer({ tab }: { tab: FileTab }) {
  const { serverUrl } = useStore();

  if (tab.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#b0aea5]">
        Loading...
      </div>
    );
  }

  switch (tab.type) {
    case "image":
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#f5f4f0]">
          <img
            src={rawFileUrl(serverUrl, tab.path)}
            alt={tab.name}
            className="max-w-full max-h-full object-contain rounded"
          />
        </div>
      );
    case "markdown":
      return (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto prose text-sm text-[#141413]">
            <Markdown remarkPlugins={[remarkGfm]}>{tab.content || ""}</Markdown>
          </div>
        </div>
      );
    case "csv":
      return <CsvView content={tab.content || ""} />;
    case "json":
      return <CodeView content={formatJson(tab.content || "")} />;
    case "code":
    case "text":
    default:
      return <CodeView content={tab.content || ""} />;
  }
}

// ── Code / text with line numbers ─────────────────────────────

function CodeView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex-1 overflow-auto font-mono text-[13px] leading-5">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-[#f0efe9]">
              <td className="select-none text-right pr-4 pl-4 text-[#d5d3ca] w-[1%] whitespace-nowrap">
                {i + 1}
              </td>
              <td className="pr-4 whitespace-pre text-[#141413]">
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CSV table ─────────────────────────────────────────────────

function CsvView({ content }: { content: string }) {
  const rows = content
    .split("\n")
    .filter(Boolean)
    .map((r) => r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));

  if (!rows.length)
    return <div className="p-6 text-[#b0aea5]">Empty file</div>;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {rows[0].map((cell, i) => (
              <th
                key={i}
                className="border-b border-[#e8e6dc] px-3 py-2 text-left font-medium bg-[#f5f4f0] sticky top-0"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className="hover:bg-[#faf9f5]">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-[#e8e6dc] px-3 py-1.5"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function formatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
