export const NOTEBOOK_KERNEL_WINDOW_PRESETS = ["30d", "90d", "12m"] as const;

export type NotebookKernelWindowPreset = (typeof NOTEBOOK_KERNEL_WINDOW_PRESETS)[number];

export const NOTEBOOK_KERNEL_KPI_IDS = [
  "kernelFunctionsInScope",
  "kernelFunctionsMeasured",
  "kernelSlaMet",
  "kernelCoverage",
  "kernelProjectsReporting",
] as const;

export type NotebookKernelKpiId = (typeof NOTEBOOK_KERNEL_KPI_IDS)[number];

export interface NotebookKernelKpi {
  id: NotebookKernelKpiId;
  label: string;
  value: number | null;
  format: "count" | "percent";
  numerator?: number;
  denominator?: number;
  hint?: string;
}

export type NotebookKernelTierId = "irreplaceable" | "essential" | "important" | "nice-to-have";

export interface NotebookKernelTier {
  id: NotebookKernelTierId;
  label: string;
  description: string;
  fundingPosture: string;
  catalogued: number;
  inScope: number;
  measured: number;
  commitments: number;
  projectsReporting: number;
  readings: number;
  lastReadingAt: string | null;
  sla: { scored: number; passed: number; metPct: number | null };
  coverage: { received: number; expected: number; pct: number | null };
}

export interface NotebookKernelInventoryRow {
  /** Stable row identity; deliberately not an author-selectable display column. */
  id: string;
  function: string;
  tier: NotebookKernelTierId;
  category: string;
  subcategory: string;
  inScope: boolean;
  maintainers: number;
  measured: boolean;
  commitments: number;
  projectsReporting: number;
  readings: number;
  lastReadingAt: string | null;
  slaMetPct: number | null;
  coveragePct: number | null;
}

export type NotebookKernelInventoryColumnId = Exclude<keyof NotebookKernelInventoryRow, "id">;

export interface NotebookKernelInventoryColumn {
  id: NotebookKernelInventoryColumnId;
  label: string;
  format: "text" | "count" | "boolean" | "percent" | "date";
}

/**
 * The complete inventory-column vocabulary offered to an author.
 *
 * Keeping this list in the query contract prevents a renderer from guessing
 * across additive API fields and accidentally turning an infrastructure field
 * into a public reporting choice.
 */
export const NOTEBOOK_KERNEL_INVENTORY_COLUMNS = [
  { id: "function", label: "Function", format: "text" },
  { id: "tier", label: "Tier", format: "text" },
  { id: "category", label: "Category", format: "text" },
  { id: "subcategory", label: "Subcategory", format: "text" },
  { id: "inScope", label: "In scope", format: "boolean" },
  { id: "maintainers", label: "Maintainers", format: "count" },
  { id: "measured", label: "Measured", format: "boolean" },
  { id: "commitments", label: "Commitments", format: "count" },
  { id: "projectsReporting", label: "Projects reporting", format: "count" },
  { id: "readings", label: "Readings", format: "count" },
  { id: "lastReadingAt", label: "Last reading", format: "date" },
  { id: "slaMetPct", label: "SLA met", format: "percent" },
  { id: "coveragePct", label: "Coverage", format: "percent" },
] as const satisfies readonly NotebookKernelInventoryColumn[];

export interface NotebookKernelData {
  preset: NotebookKernelWindowPreset;
  windowDays: number;
  kpis: NotebookKernelKpi[];
  tiers: NotebookKernelTier[];
  inventory: {
    columns: typeof NOTEBOOK_KERNEL_INVENTORY_COLUMNS;
    rows: NotebookKernelInventoryRow[];
  };
}

export interface NotebookStructuredRatio {
  /** Canonical scalar used by sorting and accessibility output. */
  value: number | null;
  numerator: number | null;
  denominator: number | null;
}

export interface NotebookKernelTierRollupRow {
  tier: NotebookKernelTierId;
  description: string;
  functionsCount: number;
  coverage90d: NotebookStructuredRatio;
  reporting: NotebookStructuredRatio;
  /** Enum key; display copy is declared on the column, not guessed by the renderer. */
  fundingPosture: NotebookKernelTierId;
}

export type NotebookKernelTierRollupColumn =
  | {
      id: "tier" | "fundingPosture";
      label: string;
      format: "enum";
      labels: Readonly<Record<NotebookKernelTierId, string>>;
      subline?: "description";
    }
  | { id: "functionsCount"; label: string; format: "count" }
  | {
      id: "coverage90d" | "reporting";
      label: string;
      format: "ratio";
      valueKind: "percent" | "count";
    };

export type NotebookTableAccentToken = "critical" | "high" | "medium" | "low";

export interface NotebookKernelTierRollup {
  windowDays: 90;
  columns: NotebookKernelTierRollupColumn[];
  rows: NotebookKernelTierRollupRow[];
  accentBy: {
    column: "tier";
    tokens: Readonly<Record<NotebookKernelTierId, NotebookTableAccentToken>>;
  };
  source: {
    endpoint: string;
    methodology: string;
    canonicalNotes: string[];
  };
}
