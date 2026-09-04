import { z } from "zod";
import {
  NOTEBOOK_METRIC_AGGREGATIONS,
  NOTEBOOK_METRIC_DIMENSIONS,
  NOTEBOOK_METRIC_ENTITIES,
  NOTEBOOK_METRIC_VALUE_KINDS,
  NOTEBOOK_METRIC_WINDOWS,
} from "./notebook-metric-registry.types";

const SourceSchema = z.object({
  tool: z.string().max(100),
  endpoints: z.array(z.string().max(300)).max(10),
  methodology: z.string().max(2_000),
  canonicalNotes: z.array(z.string().max(1_000)).max(20).optional(),
});

const FilterSchema = z.object({
  id: z.enum(["programIds", "projectUIDs", "aggregation", "tier", "category", "inScope"]),
  label: z.string().max(100),
  kind: z.enum(["multi-select", "single-select", "boolean"]),
  required: z.boolean(),
  optionsSource: z.enum(["programs", "projects", "aggregations", "kernel-tiers"]).optional(),
  dimensions: z.array(z.enum(NOTEBOOK_METRIC_DIMENSIONS)).max(6).optional(),
});

const MetricDefinitionSchema = z.object({
  id: z.string().max(200),
  label: z.string().max(200),
  description: z.string().max(2_000),
  entity: z.enum(NOTEBOOK_METRIC_ENTITIES),
  measure: z.string().max(100),
  valueKind: z.enum(NOTEBOOK_METRIC_VALUE_KINDS),
  unit: z.string().max(100).nullable(),
  dimensions: z.array(z.enum(NOTEBOOK_METRIC_DIMENSIONS)).max(6),
  filters: z.array(FilterSchema).max(6),
  windows: z.object({
    allowed: z.array(z.enum(NOTEBOOK_METRIC_WINDOWS)).max(4),
    default: z.enum(NOTEBOOK_METRIC_WINDOWS),
  }),
  source: SourceSchema,
});

export const NotebookMetricCatalogDtoSchema = z.object({
  community: z.object({
    requested: z.string().max(200),
    slug: z.string().max(200),
    variantUIDs: z.array(z.string().max(200)).max(20),
  }),
  items: z.array(MetricDefinitionSchema).max(1_000),
  options: z.object({
    programs: z
      .array(
        z.object({
          id: z.string().max(200),
          label: z.string().max(300),
          type: z.string().max(100).nullable(),
          chainID: z.number().int().nullable(),
        })
      )
      .max(500),
    aggregations: z.array(z.enum(NOTEBOOK_METRIC_AGGREGATIONS)).max(6),
    kernelTiers: z.array(z.string().max(100)).max(10),
  }),
});

const QueryFiltersSchema = z.object({
  programIds: z.array(z.string().max(200)).max(100).optional(),
  projectUIDs: z.array(z.string().max(200)).max(100).optional(),
  aggregation: z.enum(NOTEBOOK_METRIC_AGGREGATIONS).optional(),
  tier: z.array(z.string().max(100)).max(10).optional(),
  category: z.array(z.string().max(200)).max(50).optional(),
  inScope: z.boolean().optional(),
});

export const NotebookMetricQueryResultDtoSchema = z.object({
  query: z.object({
    communityUidOrSlug: z.string().max(200),
    metricId: z.string().max(200),
    groupBy: z.enum(NOTEBOOK_METRIC_DIMENSIONS),
    window: z.enum(NOTEBOOK_METRIC_WINDOWS),
    filters: QueryFiltersSchema,
    entity: z.enum(NOTEBOOK_METRIC_ENTITIES),
    measure: z.string().max(100),
  }),
  columns: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(200),
        valueKind: z.enum(["text", ...NOTEBOOK_METRIC_VALUE_KINDS]),
        unit: z.string().max(100).nullable(),
      })
    )
    .max(10),
  rows: z
    .array(
      z.object({
        key: z.string().max(300),
        label: z.string().max(500),
        dimensions: z
          .object({
            none: z.string().max(200).optional(),
            program: z.string().max(200).optional(),
            project: z.string().max(200).optional(),
            date: z.string().max(20).optional(),
            tier: z.string().max(100).optional(),
            function: z.string().max(200).optional(),
          })
          .strict(),
        value: z.number().finite().nullable(),
        displayValue: z.string().max(200),
        unit: z.string().max(100).nullable().optional(),
      })
    )
    .max(5_000),
  meta: z.object({
    generatedAt: z.string().datetime(),
    window: z.enum(NOTEBOOK_METRIC_WINDOWS),
    source: SourceSchema,
    absenceDisplay: z.literal("—"),
    warnings: z.array(z.string().max(1_000)).max(20),
  }),
});

export type NotebookMetricCatalogDto = z.infer<typeof NotebookMetricCatalogDtoSchema>;
export type NotebookMetricQueryResultDto = z.infer<typeof NotebookMetricQueryResultDtoSchema>;
