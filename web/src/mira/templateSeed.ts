import type { ProjectTemplate } from "../api";

// ═══════════════════════════════════════════════════════════════
//  Shared gallery seed — static project template cards used as
//  placeholders when the backend has no real templates yet, and
//  as default content across EmptyState and ProjectWelcome so the
//  gallery always looks populated for BU review.
//
//  Ids prefixed `demo/` are pure placeholders (backend will 404 on
//  creation). The three non-prefixed ids match real templates that
//  ship in server/workspace/project-templates/.
// ═══════════════════════════════════════════════════════════════

export interface SeedTemplate extends ProjectTemplate {
  placeholder?: boolean;
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ── Real backend templates (3) ──────────────────────────────
  {
    id: "finance/q4-analysis",
    name: "Q4 Financial Analysis",
    description:
      "Generate quarterly financial reports with trend analysis, variance breakdown, and executive summaries.",
    author: "Finance BU",
    bu: "finance",
    icon: "📊",
    gradient: "from-[#f0e9dc] to-[#d6c5b3]",
  },
  {
    id: "hr/policy-drafter",
    name: "Policy Drafter",
    description:
      "Draft, review, and localize HR policies. Keeps voice consistent with the ByteDance employee handbook.",
    author: "HR BU",
    bu: "hr",
    icon: "📘",
    gradient: "from-[#dfe2d0] to-[#b9bfa0]",
  },
  {
    id: "da/insights-dashboard",
    name: "Insights Dashboard",
    description:
      "Turn CSV or SQL query results into narrative insights with charts, significance tests, and next-step recommendations.",
    author: "Data Analytics BU",
    bu: "da",
    icon: "📈",
    gradient: "from-[#e0d5e5] to-[#b5a6bf]",
  },

];

/** Merge real backend templates into the seed list: real templates
 *  replace any seed entry with the same id, keeping the seed order. */
export function mergeTemplates(
  real: ProjectTemplate[],
): SeedTemplate[] {
  const realById = new Map(real.map((t) => [t.id, t]));
  return SEED_TEMPLATES.map(
    (seed) =>
      (realById.get(seed.id) && {
        ...realById.get(seed.id)!,
        placeholder: false,
      }) ||
      seed,
  );
}
