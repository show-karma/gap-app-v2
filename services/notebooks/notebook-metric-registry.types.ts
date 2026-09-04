export const NOTEBOOK_METRIC_ENTITIES = [
  "program",
  "funding",
  "milestone",
  "indicator",
  "kernel",
] as const;
export const NOTEBOOK_METRIC_DIMENSIONS = [
  "none",
  "program",
  "project",
  "date",
  "tier",
  "function",
] as const;
export const NOTEBOOK_METRIC_WINDOWS = ["30d", "90d", "12m", "all"] as const;
export const NOTEBOOK_METRIC_VALUE_KINDS = [
  "currency",
  "count",
  "percent",
  "duration",
  "number",
] as const;
export const NOTEBOOK_METRIC_AGGREGATIONS = ["sum", "last", "first", "avg", "max", "min"] as const;

export type NotebookMetricEntity = (typeof NOTEBOOK_METRIC_ENTITIES)[number];
export type NotebookMetricDimension = (typeof NOTEBOOK_METRIC_DIMENSIONS)[number];
export type NotebookMetricWindow = (typeof NOTEBOOK_METRIC_WINDOWS)[number];
export type NotebookMetricValueKind = (typeof NOTEBOOK_METRIC_VALUE_KINDS)[number];
export type NotebookMetricAggregation = (typeof NOTEBOOK_METRIC_AGGREGATIONS)[number];

export interface NotebookMetricSource {
  tool: string;
  endpoints: string[];
  methodology: string;
  canonicalNotes?: string[];
}

export interface NotebookMetricFilterDefinition {
  id: "programIds" | "projectUIDs" | "aggregation" | "tier" | "category" | "inScope";
  label: string;
  kind: "multi-select" | "single-select" | "boolean";
  required: boolean;
  optionsSource?: "programs" | "projects" | "aggregations" | "kernel-tiers";
  dimensions?: NotebookMetricDimension[];
}

export interface NotebookMetricDefinition {
  id: string;
  label: string;
  description: string;
  entity: NotebookMetricEntity;
  measure: string;
  valueKind: NotebookMetricValueKind;
  unit: string | null;
  dimensions: NotebookMetricDimension[];
  filters: NotebookMetricFilterDefinition[];
  windows: { allowed: NotebookMetricWindow[]; default: NotebookMetricWindow };
  source: NotebookMetricSource;
}

export interface NotebookMetricProgramOption {
  id: string;
  label: string;
  type: string | null;
  chainID: number | null;
}

export interface NotebookMetricCatalog {
  community: { requested: string; slug: string; variantUIDs: string[] };
  items: NotebookMetricDefinition[];
  options: {
    programs: NotebookMetricProgramOption[];
    aggregations: NotebookMetricAggregation[];
    kernelTiers: string[];
  };
  freshness: { stale: boolean };
}

export interface NotebookMetricQueryFilters {
  programIds?: string[];
  projectUIDs?: string[];
  aggregation?: NotebookMetricAggregation;
  tier?: string[];
  category?: string[];
  inScope?: boolean;
}

export interface NotebookMetricQueryInput {
  communityId: string;
  metricId: string;
  groupBy: NotebookMetricDimension;
  filters?: NotebookMetricQueryFilters;
  window: NotebookMetricWindow;
}

export interface NotebookMetricQueryResult {
  query: {
    communityUidOrSlug: string;
    metricId: string;
    groupBy: NotebookMetricDimension;
    window: NotebookMetricWindow;
    filters: NotebookMetricQueryFilters;
    entity: NotebookMetricEntity;
    measure: string;
  };
  columns: Array<{
    id: string;
    label: string;
    valueKind: "text" | NotebookMetricValueKind;
    unit: string | null;
  }>;
  rows: Array<{
    key: string;
    label: string;
    dimensions: Partial<Record<NotebookMetricDimension, string>>;
    value: number | null;
    displayValue: string;
    unit?: string | null;
  }>;
  meta: {
    generatedAt: string;
    window: NotebookMetricWindow;
    source: NotebookMetricSource;
    absenceDisplay: "—";
    warnings: string[];
    stale: boolean;
  };
}
