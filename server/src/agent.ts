import { query } from "@anthropic-ai/claude-agent-sdk";

// ── Wire events (kept compatible with the previous agent) ────

export type AgentEvent =
  | { type: "session_id"; id: string }
  | { type: "text_delta"; content: string }
  | { type: "thinking_delta"; content: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, any> }
  | {
      type: "tool_result";
      id: string;
      content: string;
      is_error?: boolean;
    }
  | { type: "error"; message: string }
  | { type: "done" };

export interface RunAgentOptions {
  prompt: string;
  cwd: string;
  /** SDK session id to resume. Omit for a new session. */
  resumeSessionId?: string;
  signal?: AbortSignal;
}

// ── Runner ───────────────────────────────────────────────────

export async function* runAgent(
  opts: RunAgentOptions,
): AsyncGenerator<AgentEvent> {
  const { prompt, cwd, resumeSessionId, signal } = opts;

  const abortController = new AbortController();
  if (signal) signal.addEventListener("abort", () => abortController.abort());

  let emittedSessionId = false;

  try {
    const q = query({
      prompt,
      options: {
        cwd,
        abortController,
        // Load CLAUDE.md and .claude/skills/ from the project directory
        settingSources: ["project"],
        // Demo: skip all permission prompts (sandbox handles isolation in prod)
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        ...(resumeSessionId ? { resume: resumeSessionId } : {}),
      },
    });

    for await (const msg of q) {
      // Capture and forward the SDK session id once (on init or first assistant turn)
      if (!emittedSessionId && (msg as any).session_id) {
        yield { type: "session_id", id: (msg as any).session_id };
        emittedSessionId = true;
      }

      switch (msg.type) {
        case "assistant": {
          const content = (msg as any).message?.content;
          if (!Array.isArray(content)) break;
          for (const block of content) {
            if (block.type === "text" && block.text) {
              yield { type: "text_delta", content: block.text };
            } else if (block.type === "thinking" && block.thinking) {
              yield { type: "thinking_delta", content: block.thinking };
            } else if (block.type === "tool_use") {
              yield {
                type: "tool_call",
                id: block.id,
                name: block.name,
                input: block.input ?? {},
              };
            }
          }
          break;
        }

        case "user": {
          // Tool results arrive as user-role messages containing tool_result blocks
          const content = (msg as any).message?.content;
          if (!Array.isArray(content)) break;
          for (const block of content) {
            if (block.type === "tool_result") {
              yield {
                type: "tool_result",
                id: block.tool_use_id,
                content: stringifyToolResult(block.content),
                is_error: !!block.is_error,
              };
            }
          }
          break;
        }

        case "result": {
          if (msg.subtype !== "success") {
            const errs = (msg as any).errors;
            yield {
              type: "error",
              message:
                Array.isArray(errs) && errs.length > 0
                  ? errs.join("; ")
                  : `Agent ended: ${msg.subtype}`,
            };
          }
          break;
        }

        // init/system/partial/hook events are ignored for the wire
        default:
          break;
      }
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    yield { type: "error", message: `SDK error: ${m}` };
  }

  yield { type: "done" };
}

// ── Helpers ──────────────────────────────────────────────────

function stringifyToolResult(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c === "string" ? c : c?.text ?? JSON.stringify(c)))
      .join("");
  }
  if (content == null) return "";
  return JSON.stringify(content);
}
