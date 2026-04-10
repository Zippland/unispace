import { useEffect, useState } from "react";
import { useStore } from "../store";
import * as api from "../api";

export type CommandEditorMode =
  | { kind: "create" }
  | { kind: "edit"; path: string; initialName: string; lockName?: boolean };

interface Props {
  mode: CommandEditorMode;
  onClose: () => void;
  /** Called after a successful save. Receives the final file path so the
   *  caller can refresh the sidebar listing. */
  onSaved: (path: string) => void;
}

const COMMANDS_DIR = ".claude/commands";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CommandEditorPanel({ mode, onClose, onSaved }: Props) {
  const { serverUrl } = useStore();

  const isEdit = mode.kind === "edit";
  const lockName = isEdit && mode.lockName === true;

  const [name, setName] = useState(isEdit ? mode.initialName : "");
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
        if (!cancelled) setText(content);
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

  const canSubmit = (lockName || name.trim()) && text.trim() && !saving && !loading;

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    try {
      if (mode.kind === "edit" && lockName) {
        // Project prompt — name locked, just overwrite
        await api.saveFile(serverUrl, mode.path, text);
        onSaved(mode.path);
      } else if (mode.kind === "edit") {
        // Command — may have been renamed
        const slug = slugify(name);
        if (!slug) throw new Error("Invalid name");
        const newPath = `${COMMANDS_DIR}/${slug}.md`;

        if (newPath !== mode.path) {
          await api.saveFile(serverUrl, newPath, text);
          try {
            await api.deleteFile(serverUrl, mode.path);
          } catch {
            /* tolerate */
          }
        } else {
          await api.saveFile(serverUrl, mode.path, text);
        }
        onSaved(newPath);
      } else {
        // Create new command
        const slug = slugify(name);
        if (!slug) throw new Error("Invalid name");
        const path = `${COMMANDS_DIR}/${slug}.md`;
        await api.saveFile(serverUrl, path, text);
        onSaved(path);
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
      setSaving(false);
    }
  }

  const title = lockName
    ? "Edit project prompt"
    : isEdit
      ? `Edit command · ${mode.initialName}`
      : "New command";

  const subtitle = lockName
    ? "Project-level instructions loaded as CLAUDE.md at the start of every session."
    : isEdit
      ? "Update the trigger name or the prompt text injected into chat."
      : "Create a reusable prompt you can drag into the chat input.";

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
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#6b6963]">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summarize this file"
                  maxLength={64}
                  autoFocus={mode.kind === "create"}
                  className="w-full rounded-lg border border-[#e8e6dc] bg-[#faf9f5] px-3 py-2.5 text-[13px] text-[#141413] outline-none transition focus:border-[#a07cc5]/60 focus:ring-1 focus:ring-[#a07cc5]/20"
                />
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <label className="mb-1.5 block text-[12px] font-medium text-[#6b6963]">
                {lockName ? "Content" : "Prompt text"}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                autoFocus={isEdit}
                placeholder={
                  lockName
                    ? "# Project instructions\n\nDescribe what this agent does, what it knows, and how it should behave."
                    : "This text will be injected into the chat input.\n\nExample:\nSummarize the attached file in 5 bullet points. Focus on the key decisions and open questions."
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
