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
    projects: { id: string; name: string; slug: string; path: string; updatedAt: number }[];
  }>;
}

export async function switchProject(url: string, id: string) {
  const res = await fetch(`${url}/api/projects/current`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to switch project");
  return res.json();
}

export async function cloneProject(url: string, sourceId: string, newName: string) {
  const res = await fetch(`${url}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: sourceId, to: newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Clone failed" }));
    throw new Error(err.error || "Clone failed");
  }
  return res.json() as Promise<{ ok: boolean; id: string; name: string }>;
}

export async function deleteProject(url: string, id: string) {
  const res = await fetch(`${url}/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(err.error || "Delete failed");
  }
  return res.json();
}

export async function renameProject(url: string, id: string, newName: string) {
  const res = await fetch(`${url}/api/projects/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Rename failed" }));
    throw new Error(err.error || "Rename failed");
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
  emoji?: string;
  description?: string;
}

export async function fetchProjectSettings(url: string, id: string) {
  const res = await fetch(`${url}/api/projects/${encodeURIComponent(id)}/settings`);
  return res.json() as Promise<ProjectSettings>;
}

export async function updateProjectSettings(
  url: string,
  id: string,
  partial: ProjectSettings,
) {
  const res = await fetch(`${url}/api/projects/${encodeURIComponent(id)}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function fetchSessions(url: string, all?: boolean) {
  const params = all ? "?all=1" : "";
  const res = await fetch(`${url}/api/sessions${params}`);
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

// Unfiltered-files toggle is persisted in localStorage so the sidebar
// setting survives reloads AND any caller that refreshes the file tree
// (ChatPanel auto-refresh, App bootstrap, etc.) stays consistent with
// the sidebar's current preference without having to thread a flag
// through every call site.
export const SHOW_ALL_FILES_KEY = "us:file_show_all";

function getShowAllFiles(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_ALL_FILES_KEY) === "1";
}

export async function fetchFiles(url: string) {
  const q = getShowAllFiles() ? "?all=1" : "";
  const res = await fetch(`${url}/api/files${q}`);
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

// ── Datasources ───────────────────────────────────────────────

export interface DatasourceDimension {
  key: string;
  label: string;
  type: string;
  values?: string[];
}
export interface DatasourceMetric {
  key: string;
  label: string;
  unit?: string;
  agg?: string;
}
export interface DatasourceSummary {
  id: string;
  type: string;
  name: string;
  display_name?: string;
  region?: string;
  description: string;
  schema: {
    dimensions: DatasourceDimension[];
    metrics: DatasourceMetric[];
  };
  is_demo_sample: boolean;
}

export async function fetchDatasources(
  url: string,
): Promise<DatasourceSummary[]> {
  const res = await fetch(`${url}/api/datasources`);
  if (!res.ok) throw new Error("Failed to fetch datasources");
  return res.json();
}

export interface DatasourceCatalogItem extends DatasourceSummary {
  installed: boolean;
}

export async function fetchDatasourceCatalog(
  url: string,
): Promise<DatasourceCatalogItem[]> {
  const res = await fetch(`${url}/api/datasources/catalog`);
  if (!res.ok) throw new Error("Failed to fetch catalog");
  return res.json();
}

export async function installDatasource(
  url: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${url}/api/datasources/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Install failed");
  }
}

export async function uninstallDatasource(
  url: string,
  id: string,
): Promise<void> {
  const res = await fetch(
    `${url}/api/datasources/${id
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Uninstall failed");
  }
}

// ── Tasks ─────────────────────────────────────────────────────

export type TaskTrigger = "manual" | "fixed" | "model";
export type TaskContinuation = "new" | "append";
export type TaskStatus = "backlog" | "planned" | "running";

export interface TaskFile {
  name: string;
  description: string;
  trigger: TaskTrigger;
  schedule?: string;
  continuation?: TaskContinuation;
  status: TaskStatus;
  source?: string;
  last_run_at?: string;
  last_session_id?: string;
  body: string;
}

export async function fetchTasks(url: string): Promise<TaskFile[]> {
  const res = await fetch(`${url}/api/tasks`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function fetchTask(url: string, name: string): Promise<TaskFile> {
  const res = await fetch(`${url}/api/tasks/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

export interface SaveTaskInput {
  name: string;
  description?: string;
  trigger?: TaskTrigger;
  schedule?: string;
  continuation?: TaskContinuation;
  status?: TaskStatus;
  source?: string;
  body: string;
}

export async function saveTask(
  url: string,
  input: SaveTaskInput,
): Promise<TaskFile> {
  const res = await fetch(`${url}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Save failed");
  }
  return res.json();
}

export async function deleteTask(url: string, name: string): Promise<void> {
  const res = await fetch(`${url}/api/tasks/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function runTask(
  url: string,
  name: string,
): Promise<{ session_id: string }> {
  const res = await fetch(
    `${url}/api/tasks/${encodeURIComponent(name)}/run`,
    { method: "POST" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Run failed");
  }
  return res.json();
}

// ── Connectors ────────────────────────────────────────────────

export interface ConnectorAction {
  name: string;
  description: string;
}

export interface ConnectorSummary {
  id: string;
  type: string;
  name: string;
  display_name?: string;
  description: string;
  status?: "connected" | "needs_auth" | "disabled";
  actions: ConnectorAction[];
  is_demo: boolean;
}

export interface ConnectorCatalogItem extends ConnectorSummary {
  installed: boolean;
}

export async function fetchConnectors(
  url: string,
): Promise<ConnectorSummary[]> {
  const res = await fetch(`${url}/api/connectors`);
  if (!res.ok) throw new Error("Failed to fetch connectors");
  return res.json();
}

export async function fetchConnectorCatalog(
  url: string,
): Promise<ConnectorCatalogItem[]> {
  const res = await fetch(`${url}/api/connectors/catalog`);
  if (!res.ok) throw new Error("Failed to fetch connector catalog");
  return res.json();
}

export async function installConnector(
  url: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${url}/api/connectors/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Install failed");
  }
}

export async function uninstallConnector(
  url: string,
  id: string,
): Promise<void> {
  const res = await fetch(
    `${url}/api/connectors/${id
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Uninstall failed");
  }
}
