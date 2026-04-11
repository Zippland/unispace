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

  // ── Finance BU placeholders ────────────────────────────────
  {
    id: "demo/finance-expense-report",
    name: "Expense Reporter",
    description:
      "Reconcile receipts, categorize expenses, and draft the T&E submission packet for approval.",
    author: "Finance BU",
    bu: "finance",
    icon: "🧾",
    gradient: "from-[#ecd8c0] to-[#c9a57a]",
    placeholder: true,
  },
  {
    id: "demo/finance-budget-planner",
    name: "Budget Planner",
    description:
      "Build a quarterly budget from last year's actuals plus planned headcount and vendor spend.",
    author: "Finance BU",
    bu: "finance",
    icon: "💰",
    gradient: "from-[#eee3c7] to-[#c6ac7a]",
    placeholder: true,
  },

  // ── HR BU placeholders ─────────────────────────────────────
  {
    id: "demo/hr-onboarding",
    name: "Onboarding Kit",
    description:
      "Draft a day-1 through week-4 onboarding plan for a new hire based on role, team, and level.",
    author: "HR BU",
    bu: "hr",
    icon: "🎒",
    gradient: "from-[#dbe5d0] to-[#a2b08e]",
    placeholder: true,
  },
  {
    id: "demo/hr-perf-review",
    name: "Performance Review",
    description:
      "Draft calibrated performance reviews from peer feedback, self-assessment, and PR history.",
    author: "HR BU",
    bu: "hr",
    icon: "📝",
    gradient: "from-[#d4dec3] to-[#98a684]",
    placeholder: true,
  },

  // ── DA BU placeholders ─────────────────────────────────────
  {
    id: "demo/da-funnel",
    name: "Funnel Analysis",
    description:
      "Investigate conversion drop-offs across a product funnel with cohort comparison and segment splits.",
    author: "Data Analytics BU",
    bu: "da",
    icon: "🔎",
    gradient: "from-[#ddd2e7] to-[#9b8bb5]",
    placeholder: true,
  },

  // ── PMO placeholders ───────────────────────────────────────
  {
    id: "demo/pmo-status",
    name: "Weekly Status Report",
    description:
      "Consolidate team updates, risks, and decisions into a single leadership-ready status note.",
    author: "PMO",
    bu: "pmo",
    icon: "📋",
    gradient: "from-[#d5dfe8] to-[#92a8bf]",
    placeholder: true,
  },
  {
    id: "demo/pmo-okr",
    name: "OKR Tracker",
    description:
      "Draft, rate, and comment on quarterly OKRs. Flags drift between weekly progress and target.",
    author: "PMO",
    bu: "pmo",
    icon: "🎯",
    gradient: "from-[#d0dde8] to-[#8ca6bf]",
    placeholder: true,
  },

  // ── Legal placeholders ─────────────────────────────────────
  {
    id: "demo/legal-contract-review",
    name: "Contract Reviewer",
    description:
      "Review vendor contracts for non-standard clauses, risky indemnifications, and missing terms.",
    author: "Legal BU",
    bu: "legal",
    icon: "⚖️",
    gradient: "from-[#e4dcc2] to-[#a79a72]",
    placeholder: true,
  },

  // ── Design placeholders ────────────────────────────────────
  {
    id: "demo/design-brand-kit",
    name: "Brand Kit Builder",
    description:
      "Assemble a brand kit from existing assets: palette, type scale, logo variants, tone guide.",
    author: "Design BU",
    bu: "design",
    icon: "🎨",
    gradient: "from-[#ead0db] to-[#c48ba4]",
    placeholder: true,
  },

  // ── Community placeholders ─────────────────────────────────
  {
    id: "demo/community-writing-coach",
    name: "Writing Coach",
    description:
      "Tighten drafts, catch passive voice, and propose sharper phrasings — without rewriting your voice.",
    author: "Community",
    bu: "community",
    icon: "✍️",
    gradient: "from-[#d8e4da] to-[#7fa188]",
    placeholder: true,
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
