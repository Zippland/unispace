import type OpenAI from "openai";
import type { TaskStore } from "./task";

// ── Tool interface ────────────────────────────────────────────

export interface ToolContext {
  workDir: string;
  taskStore: TaskStore;
  channel?: string; // "web" | "feishu" | ...
  onSendFile?: (filePath: string) => Promise<void>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  available?: (ctx: ToolContext) => boolean;
  execute(input: Record<string, any>, ctx: ToolContext): Promise<string>;
}

// ── Registry ──────────────────────────────────────────────────

const MAX_OUTPUT = 100_000;

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(...tools: Tool[]): void {
    for (const t of tools) this.tools.set(t.name, t);
  }

  async execute(
    name: string,
    input: Record<string, any>,
    ctx: ToolContext,
  ): Promise<{ output: string; isError?: boolean }> {
    const tool = this.tools.get(name);
    if (!tool) return { output: `Unknown tool: ${name}`, isError: true };

    try {
      let out = await tool.execute(input, ctx);
      if (out.length > MAX_OUTPUT)
        out = out.slice(0, MAX_OUTPUT) + "\n... (truncated)";
      return { output: out };
    } catch (err) {
      return {
        output: err instanceof Error ? err.message : String(err),
        isError: true,
      };
    }
  }

  definitions(ctx?: ToolContext): OpenAI.ChatCompletionTool[] {
    return [...this.tools.values()]
      .filter((t) => !t.available || !ctx || t.available(ctx))
      .map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
  }
}

// ── Setup (register all tools) ────────────────────────────────

import { codingTools } from "./coding";
import { taskTools } from "./task";

export function createRegistry(): ToolRegistry {
  const r = new ToolRegistry();
  r.register(...codingTools, ...taskTools);
  return r;
}
