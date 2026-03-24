// ── SSE parser ────────────────────────────────────────────────

function parseSSE(buffer: string) {
  const parsed: { event: string; data: string }[] = [];
  const chunks = buffer.split("\n\n");
  const remaining = chunks.pop() || "";
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) parsed.push({ event, data: dataLines.join("\n") });
  }
  return { parsed, remaining };
}

// ── API calls ─────────────────────────────────────────────────

export async function checkHealth(url: string) {
  const res = await fetch(`${url}/api/health`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ status: string; workDir: string }>;
}

export async function fetchSessions(url: string) {
  const res = await fetch(`${url}/api/sessions`);
  return res.json();
}

export async function createSession(url: string) {
  const res = await fetch(`${url}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return res.json();
}

export async function deleteSession(url: string, id: string) {
  await fetch(`${url}/api/sessions/${id}`, { method: "DELETE" });
}

export async function fetchFiles(url: string) {
  const res = await fetch(`${url}/api/files`);
  return res.json();
}

export async function fetchFileContent(url: string, path: string) {
  const res = await fetch(
    `${url}/api/files/read?path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) throw new Error(`Failed to read ${path}`);
  return res.text();
}

export function rawFileUrl(url: string, path: string) {
  return `${url}/api/files/raw?path=${encodeURIComponent(path)}`;
}

export async function fetchSessionMessages(url: string, sessionId: string) {
  const res = await fetch(`${url}/api/sessions/${sessionId}/messages`);
  return res.json();
}

// ── Convert raw OpenAI messages → display format ──────────────

import type { ChatMessage, MessagePart } from "./store";

export function convertRawMessages(raw: any[]): ChatMessage[] {
  const result: ChatMessage[] = [];

  for (const msg of raw) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      // Skip tool results (they have tool_call_id)
      if (msg.tool_call_id) continue;
      result.push({
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", content: typeof msg.content === "string" ? msg.content : "" }],
      });
    } else if (msg.role === "assistant") {
      const parts: MessagePart[] = [];
      if (msg.reasoning_content) {
        parts.push({ type: "thinking", content: msg.reasoning_content });
      }
      if (msg.content) {
        parts.push({ type: "text", content: msg.content });
      }
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          let input: Record<string, any> = {};
          try { input = JSON.parse(tc.function.arguments); } catch {}
          parts.push({ type: "tool_call", id: tc.id, name: tc.function.name, input });
        }
      }

      // Merge into previous assistant message if this is a continuation
      // (i.e. the previous assistant had tool_calls → got tool results → LLM continued)
      const prev = result[result.length - 1];
      if (prev?.role === "assistant" && prev.parts.some((p) => p.type === "tool_call")) {
        prev.parts.push(...parts);
      } else {
        result.push({ id: crypto.randomUUID(), role: "assistant", parts });
      }
    } else if (msg.role === "tool") {
      // Attach result to the matching tool_call in the last assistant message
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].role !== "assistant") continue;
        const tc = result[i].parts.find(
          (p) => p.type === "tool_call" && p.id === msg.tool_call_id,
        );
        if (tc) {
          tc.output = msg.content;
          break;
        }
      }
    }
  }

  return result;
}

// ── SSE message stream ────────────────────────────────────────

export async function* streamMessage(
  url: string,
  sessionId: string,
  content: string,
): AsyncGenerator<{ event: string; data: any }> {
  const res = await fetch(`${url}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { parsed, remaining } = parseSSE(buffer);
    buffer = remaining;
    for (const evt of parsed) {
      try {
        yield { event: evt.event, data: JSON.parse(evt.data) };
      } catch {
        // skip malformed
      }
    }
  }
}
