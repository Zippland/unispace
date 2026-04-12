import { useEffect, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  Customize resource registry — single source of truth.
//
//  Lists every configurable resource type that lives under the
//  Customize column. Some are PROMOTABLE: the user can pin them
//  to the top-level sidebar tab strip via an eye toggle. Others
//  are customize-only and never appear outside.
//
//  Both Sidebar (top tabs) and CustomizePanel (sub-nav) read
//  from this file so the lists never drift.
// ═══════════════════════════════════════════════════════════════

export type CustomizeSub =
  | "files"
  | "datasource"
  | "command"
  | "subagents"
  | "skills"
  | "dispatch"
  | "connectors"
  | "tasks";

export interface SubMeta {
  key: CustomizeSub;
  label: string;
  /** Whether this sub can be pinned to the top-level sidebar tab
   *  strip via the eye toggle. Customize-only items leave this false. */
  promotable?: boolean;
  subtitle: string;
}

export const SUB_NAV: SubMeta[] = [
  {
    key: "files",
    label: "Files",
    promotable: true,
    subtitle: "Project files — upload, search, browse the on-disk tree.",
  },
  {
    key: "datasource",
    label: "Datasource",
    promotable: true,
    subtitle: "Connected data sources the agent can query as tool calls.",
  },
  {
    key: "command",
    label: "Command",
    promotable: true,
    subtitle:
      "The main CLAUDE.md — the prompt that defines who this project's agent is.",
  },
  {
    key: "tasks",
    label: "Tasks",
    promotable: true,
    subtitle: "Recurring project operations — scheduled or on-demand.",
  },
  {
    key: "subagents",
    label: "Subagents",
    subtitle:
      "Specialized workers the main agent can delegate to. Each has its own prompt and tool access.",
  },
  {
    key: "skills",
    label: "Skills",
    subtitle: "Reusable capabilities the agent can invoke inside a project.",
  },
  {
    key: "dispatch",
    label: "Dispatch",
    subtitle: "Inbound adapters — where the agent receives messages from.",
  },
  {
    key: "connectors",
    label: "Connectors",
    subtitle:
      "Outbound integrations — services the agent can reach out to.",
  },
];

/** Lookup a sub by key. */
export function subMeta(key: CustomizeSub): SubMeta {
  return SUB_NAV.find((s) => s.key === key) ?? SUB_NAV[0];
}

/** Just the keys of promotable subs, in display order. */
export const PROMOTABLE_KEYS: CustomizeSub[] = SUB_NAV.filter(
  (s) => s.promotable,
).map((s) => s.key);

// ── Promoted set (which promotables are pinned to top tabs) ──

const PROMOTED_KEY = "us:promoted_subs";
const DEFAULT_PROMOTED: CustomizeSub[] = ["files", "datasource"];

function loadPromoted(): Set<CustomizeSub> {
  if (typeof window === "undefined") return new Set(DEFAULT_PROMOTED);
  try {
    const raw = window.localStorage.getItem(PROMOTED_KEY);
    if (!raw) return new Set(DEFAULT_PROMOTED);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set(DEFAULT_PROMOTED);
    // Filter to known promotable keys to be defensive against stale state.
    return new Set(
      arr.filter((k): k is CustomizeSub =>
        (PROMOTABLE_KEYS as string[]).includes(k),
      ),
    );
  } catch {
    return new Set(DEFAULT_PROMOTED);
  }
}

function savePromoted(set: Set<CustomizeSub>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMOTED_KEY, JSON.stringify([...set]));
}

/** Hook: persistent set of promoted subs. Returns the set, an
 *  ordered array (in SUB_NAV order), and a toggle helper. */
export function usePromoted() {
  const [set, setSet] = useState<Set<CustomizeSub>>(() => loadPromoted());

  useEffect(() => {
    savePromoted(set);
  }, [set]);

  const toggle = useCallback((key: CustomizeSub) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Stable ordered array for rendering top-level tabs
  const ordered: CustomizeSub[] = PROMOTABLE_KEYS.filter((k) => set.has(k));

  return { promoted: set, ordered, toggle } as const;
}
