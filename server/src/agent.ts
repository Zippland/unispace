import { query } from "@anthropic-ai/claude-agent-sdk";
import { loadProjectContext } from "./config";

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
  /** `model` is resolved by the SDK via `settingSources: ['project']`
   *  reading `.claude/settings.json`. Nothing for us to pass here. */
  resumeSessionId?: string;
  signal?: AbortSignal;
  /** Optional main-thread subagent for this turn. The SDK does NOT
   *  auto-discover `.claude/agents/*.md` — the caller must supply both
   *  `agentName` and the full `agentDefinition` (parsed from the project
   *  file). Passed through as `options.agent` + `options.agents`. */
  agentName?: string;
  agentDefinition?: {
    description: string;
    prompt: string;
  };
  /** Override the CLAUDE.md persona (used by B-side playground/API
   *  where the prompt comes from agent config, not a project file). */
  systemPromptAppend?: string;
  /** Override the model (used by B-side agents with explicit model). */
  modelOverride?: string;
}

// ── Runner ───────────────────────────────────────────────────

export async function* runAgent(
  opts: RunAgentOptions,
): AsyncGenerator<AgentEvent> {
  const { prompt, cwd, resumeSessionId, signal, agentName, agentDefinition, systemPromptAppend, modelOverride } = opts;

  const abortController = new AbortController();
  if (signal) signal.addEventListener("abort", () => abortController.abort());

  let emittedSessionId = false;

  // Programmatic subagent registration — the SDK does not auto-load
  // `.claude/agents/*.md` via settingSources, so we pass the definition
  // we parsed on disk straight into options.agents.
  const agentsRegistry =
    agentName && agentDefinition ? { [agentName]: agentDefinition } : undefined;

  // Project context — CLAUDE.md persona + model — read via the
  // single source of truth in config.ts. We avoid SDK
  // `settingSources: ['project']` because that mode auto-injects
  // every file in `.claude/skills/` into the model's system reminder,
  // causing the LLM to treat user routing tokens as skill invocations
  // and leak internal scaffolding into its replies. UniSpace surfaces
  // skills via dedicated UI; the model only needs the project persona.
  const projectCtx = loadProjectContext(cwd);

  try {
    const q = query({
      prompt,
      options: {
        cwd,
        abortController,
        // Isolation mode — nothing auto-loaded from .claude/.
        settingSources: [],
        // Persona: B-side override takes precedence over project CLAUDE.md.
        ...(() => {
          const persona = systemPromptAppend || projectCtx.claudeMd;
          return persona
            ? {
                systemPrompt: {
                  type: "preset" as const,
                  preset: "claude_code" as const,
                  append: persona,
                },
              }
            : {};
        })(),
        ...(modelOverride || projectCtx.model
          ? { model: modelOverride || projectCtx.model }
          : {}),
        // Demo: skip all permission prompts (sandbox handles isolation in prod)
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        ...(resumeSessionId ? { resume: resumeSessionId } : {}),
        ...(agentsRegistry && agentName
          ? { agent: agentName, agents: agentsRegistry }
          : {}),
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
    console.error("  [agent] SDK query failed:", err);
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
