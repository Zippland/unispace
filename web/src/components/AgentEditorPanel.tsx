import { useEffect, useState } from "react";
import { useStore } from "../store";
import * as api from "../api";

export type AgentEditorMode =
  | { kind: "create" }
  | { kind: "edit"; path: string; initialName: string; lockName?: boolean };

interface Props {
  mode: AgentEditorMode;
  onClose: () => void;
  /** Called after a successful save. Receives the final file path so the
   *  caller can refresh the sidebar listing. */
  onSaved: (path: string) => void;
}

const AGENTS_DIR = ".claude/agents";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parse `---\nkey: value\n---\n<body>` — returns meta + body. */
function parseFrontmatter(text: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

function buildAgentFile(name: string, description: string, prompt: string): string {
  const desc = description.replace(/\n/g, " ").trim();
  return `---\nname: ${name}\ndescription: ${desc}\n---\n\n${prompt.trim()}\n`;
}

export default function AgentEditorPanel({ mode, onClose, onSaved }: Props) {
  const { serverUrl } = useStore();

  const isEdit = mode.kind === "edit";
  const lockName = isEdit && mode.lockName === true;

  const [name, setName] = useState(isEdit ? mode.initialName : "");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing content on mount (edit mode only)
  useEffect(() => {
    if (mode.kind !== "edit") return;
    let cancelled = false;
    setLoading(true);
    api
      .fetchFileContent(serverUrl, mode.path)
      .then((content) => {
        if (cancelled) return;
        if (mode.lockName) {
          // Project prompt is free-form markdown, no frontmatter.
          setText(content);
        } else {
          // Subagent file — parse frontmatter to prefill name/description.
          const { meta, body } = parseFrontmatter(content);
          if (meta.name) setName(meta.name);
          if (meta.description) setDescription(meta.description);
          setText(body.trim());
        }
      })
      .catch(() => {
        if (!cancelled) setText("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, serverUrl]);

  const canSubmit =
    (lockName || (name.trim() && description.trim())) &&
    text.trim() &&
    !saving &&
    !loading;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    try {
      if (mode.kind === "edit" && lockName) {
        // Project prompt — write body verbatim
        await api.saveFile(serverUrl, mode.path, text);
        onSaved(mode.path);
      } else if (mode.kind === "edit") {
        // Subagent — may have been renamed
        const slug = slugify(name);
        if (!slug) throw new Error("Invalid name");
        const newPath = `${AGENTS_DIR}/${slug}.md`;
        const content = buildAgentFile(slug, description, text);

        if (newPath !== mode.path) {
          await api.saveFile(serverUrl, newPath, content);
          try {
            await api.deleteFile(serverUrl, mode.path);
          } catch {
            /* tolerate */
          }
        } else {
          await api.saveFile(serverUrl, mode.path, content);
        }
        onSaved(newPath);
      } else {
        // Create new subagent
        const slug = slugify(name);
        if (!slug) throw new Error("Invalid name");
        const path = `${AGENTS_DIR}/${slug}.md`;
        const content = buildAgentFile(slug, description, text);
        await api.saveFile(serverUrl, path, content);
        onSaved(path);
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
      setSaving(false);
    }
  }

  const title = lockName
    ? "Edit Main Agent"
    : isEdit
      ? `Edit subagent · ${mode.initialName}`
      : "New subagent";

  const subtitle = lockName
    ? "The default instructions for this project, loaded at the start of every session."
    : isEdit
      ? "Rename, describe, or rewrite this subagent's persona."
      : "Create a subagent with its own instructions. You can apply it to any session from the Agents list.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e8e6dc] bg-white px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b0aea5] transition hover:bg-[#faf9f5] hover:text-[#141413]"
              title="Back to chat"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h2 className="font-['Poppins',_Arial,_sans-serif] text-[16px] font-semibold text-[#141413]">
              {title}
            </h2>
          </div>
          <p className="mt-2 pl-9 text-[12px] leading-relaxed text-[#b0aea5]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-[#b0aea5]">
            Loading…
          </div>
        ) : (
          <>
            {!lockName && (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#6b6963]">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. code-reviewer"
                    maxLength={64}
                    autoFocus={mode.kind === "create"}
                    className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2.5 text-[13px] text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-[#6b6963]">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One-line summary of when to use this agent"
                    maxLength={200}
                    className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2.5 text-[13px] text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
                  />
                </div>
              </>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <label className="mb-1.5 block text-[12px] font-medium text-[#6b6963]">
                {lockName ? "Content" : "System prompt"}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                autoFocus={isEdit}
                placeholder={
                  lockName
                    ? "# Project instructions\n\nDescribe what this workspace does, its conventions, and any context every session should know."
                    : "You are a ...\n\nDescribe the subagent's role, voice, and any constraints on how it should answer."
                }
                className="min-h-0 flex-1 w-full resize-none rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-4 py-3 font-mono text-[13px] leading-6 text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#d97757]">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[#e8e6dc] bg-white px-6 py-4">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-[#e8e6dc] px-4 py-2 text-[13px] text-[#6b6963] transition hover:bg-[#faf9f5] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="rounded-lg bg-[#141413] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#2a2a28] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
