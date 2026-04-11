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
  return res.json() as Promise<{
    status: string;
    workDir: string;
    currentProject: string;
  }>;
}

// ── Projects ──────────────────────────────────────────────────

export async function fetchProjects(url: string) {
  const res = await fetch(`${url}/api/projects`);
  return res.json() as Promise<{
    current: string;
    projects: { name: string; path: string; updatedAt: number }[];
  }>;
}

export async function switchProject(url: string, name: string) {
  const res = await fetch(`${url}/api/projects/current`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to switch project");
  return res.json();
}

export async function cloneProject(url: string, from: string, to: string) {
  const res = await fetch(`${url}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Clone failed" }));
    throw new Error(err.error || "Clone failed");
  }
  return res.json();
}

export async function deleteProject(url: string, name: string) {
  const res = await fetch(`${url}/api/projects/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(err.error || "Delete failed");
  }
  return res.json();
}

// ── Project templates (BU-federated gallery) ─────────────────

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  bu: string;
  icon?: string;
  gradient?: string;
}

export async function fetchTemplates(url: string) {
  const res = await fetch(`${url}/api/templates`);
  const data = await res.json();
  return (data.templates || []) as ProjectTemplate[];
}

export async function createProjectFromTemplate(
  url: string,
  templateId: string,
  projectName: string,
) {
  const res = await fetch(`${url}/api/projects/from-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, projectName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Create failed" }));
    throw new Error(err.error || "Create failed");
  }
  return res.json();
}

export async function createBlankProject(url: string, projectName: string) {
  const res = await fetch(`${url}/api/projects/blank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Create failed" }));
    throw new Error(err.error || "Create failed");
  }
  return res.json();
}

// ── Project settings (currently just model) ───────────────────

export interface ProjectSettings {
  model?: string;
}

export async function fetchProjectSettings(url: string, name: string) {
  const res = await fetch(`${url}/api/projects/${name}/settings`);
  return res.json() as Promise<ProjectSettings>;
}

export async function updateProjectSettings(
  url: string,
  name: string,
  partial: ProjectSettings,
) {
  const res = await fetch(`${url}/api/projects/${name}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
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

export async function saveFile(url: string, path: string, content: string) {
  const res = await fetch(`${url}/api/files/write`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error("Failed to save");
}

export async function deleteFile(url: string, path: string) {
  const res = await fetch(
    `${url}/api/files/delete?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete");
}

export async function uploadFile(
  url: string,
  file: File,
  subdir?: string,
): Promise<{ name: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  if (subdir) form.append("path", subdir);
  const res = await fetch(`${url}/api/files/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

import type { ChatMessage } from "./store";

export async function fetchSessionMessages(url: string, sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${url}/api/sessions/${sessionId}/messages`);
  return res.json();
}

// ── SSE message stream ────────────────────────────────────────

export async function* streamMessage(
  url: string,
  sessionId: string,
  content: string,
  agent?: string,
): AsyncGenerator<{ event: string; data: any }> {
  const res = await fetch(`${url}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, ...(agent ? { agent } : {}) }),
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
