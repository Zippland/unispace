import OpenAI from "openai";
import type { ToolRegistry, ToolContext } from "./tools";
import { buildSystemPrompt } from "./prompt";
import type { Config } from "./config";

// ── Types ─────────────────────────────────────────────────────

export type AgentEvent =
  | { type: "text_delta"; content: string }
  | { type: "thinking_delta"; content: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, any> }
  | { type: "tool_result"; id: string; content: string; is_error?: boolean }
  | { type: "error"; message: string }
  | { type: "done" };

// ── Agent runner factory ──────────────────────────────────────

const MAX_ITERATIONS = 50;

export function createAgentRunner(config: Config, registry: ToolRegistry) {
  const client = new OpenAI({
    apiKey: config.model.apiKey,
    baseURL: config.model.baseUrl,
  });

  return async function* runAgent(
    messages: OpenAI.ChatCompletionMessageParam[],
    ctx: ToolContext,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    const sys: OpenAI.ChatCompletionSystemMessageParam = {
      role: "system",
      content: buildSystemPrompt(ctx.workDir),
    };

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (signal?.aborted) break;

      // ── Call LLM ────────────────────────────────────────────

      let fullContent = "";
      let reasoningContent = "";
      const toolCalls = new Map<
        number,
        { id: string; name: string; arguments: string }
      >();

      try {
        const stream = await client.chat.completions.create({
          model: config.model.name,
          messages: [sys, ...messages],
          tools: registry.definitions(),
          stream: true,
          temperature: config.model.temperature,
          max_tokens: config.model.maxTokens,
        });

        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta: any = choice.delta;

          // Text content
          if (delta?.content) {
            yield { type: "text_delta", content: delta.content };
            fullContent += delta.content;
          }

          // Reasoning / thinking (Kimi K2.5)
          if (delta?.reasoning_content) {
            yield { type: "thinking_delta", content: delta.reasoning_content };
            reasoningContent += delta.reasoning_content;
          }

          // Tool calls (accumulated across chunks)
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const cur = toolCalls.get(tc.index) || {
                id: "",
                name: "",
                arguments: "",
              };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (tc.function?.arguments)
                cur.arguments += tc.function.arguments;
              toolCalls.set(tc.index, cur);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        yield { type: "error", message: `LLM error: ${msg}` };
        yield { type: "done" };
        return;
      }

      // ── Build assistant message ─────────────────────────────

      const asstMsg: Record<string, any> = {
        role: "assistant",
        content: fullContent || null,
      };

      // Kimi requires reasoning_content on assistant messages with tool_calls
      if (reasoningContent) {
        asstMsg.reasoning_content = reasoningContent;
      } else if (toolCalls.size > 0) {
        asstMsg.reasoning_content = "";
      }

      if (toolCalls.size > 0) {
        asstMsg.tool_calls = [...toolCalls.values()].map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        }));
      }

      messages.push(asstMsg as OpenAI.ChatCompletionMessageParam);

      // ── No tool calls → done ────────────────────────────────

      if (toolCalls.size === 0) {
        yield { type: "done" };
        return;
      }

      // ── Execute tools ───────────────────────────────────────

      const list = [...toolCalls.values()];

      for (const tc of list) {
        try {
          yield {
            type: "tool_call",
            id: tc.id,
            name: tc.name,
            input: JSON.parse(tc.arguments),
          };
        } catch {
          yield {
            type: "tool_call",
            id: tc.id,
            name: tc.name,
            input: { _raw: tc.arguments },
          };
        }
      }

      const results = await Promise.all(
        list.map((tc) => {
          let input: Record<string, any>;
          try {
            input = JSON.parse(tc.arguments);
          } catch {
            return { output: `Invalid JSON arguments: ${tc.arguments}`, isError: true };
          }
          return registry.execute(tc.name, input, ctx);
        }),
      );

      for (let j = 0; j < list.length; j++) {
        yield {
          type: "tool_result",
          id: list[j].id,
          content: results[j].output,
          is_error: results[j].isError,
        };
        messages.push({
          role: "tool" as const,
          content: results[j].output,
          tool_call_id: list[j].id,
        });
      }

      // Loop continues → next LLM call with tool results
    }

    yield { type: "error", message: "Max iterations reached" };
    yield { type: "done" };
  };
}
