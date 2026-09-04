import "server-only";

import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { notebookIndexerBaseUrl } from "./notebook-config-api";
import {
  type NotebookMetricCatalogDto,
  NotebookMetricCatalogDtoSchema,
  type NotebookMetricQueryResultDto,
  NotebookMetricQueryResultDtoSchema,
} from "./notebook-metric-registry.dto";
import {
  NOTEBOOK_METRIC_AGGREGATIONS,
  NOTEBOOK_METRIC_DIMENSIONS,
  NOTEBOOK_METRIC_WINDOWS,
  type NotebookMetricCatalog,
  type NotebookMetricQueryFilters,
  type NotebookMetricQueryInput,
  type NotebookMetricQueryResult,
} from "./notebook-metric-registry.types";

const METRIC_QUERY_SHAPE_VERSION = "v1";
const METRIC_REVALIDATE_SECONDS = 3600;
const CommunityIdSchema = z.string().trim().min(1).max(200);
const FilterValuesSchema = z.array(z.string().trim().min(1).max(200)).max(100);
const QueryInputSchema = z
  .object({
    communityId: CommunityIdSchema,
    metricId: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9][a-z0-9.-]*$/),
    groupBy: z.enum(NOTEBOOK_METRIC_DIMENSIONS),
    window: z.enum(NOTEBOOK_METRIC_WINDOWS),
    filters: z
      .object({
        programIds: FilterValuesSchema.optional(),
        projectUIDs: FilterValuesSchema.optional(),
        aggregation: z.enum(NOTEBOOK_METRIC_AGGREGATIONS).optional(),
        tier: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
        category: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
        inScope: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const lastGoodCatalog = new Map<string, NotebookMetricCatalog>();
const lastGoodQuery = new Map<string, NotebookMetricQueryResult>();

export function notebookMetricTag(communityId: string): string {
  return `notebook-metrics:${communityId.toLowerCase()}`;
}

export function __resetNotebookMetricLastGood(): void {
  lastGoodCatalog.clear();
  lastGoodQuery.clear();
}

function reportRefreshFailure(
  communityId: string,
  stage: "catalog" | "query",
  error: unknown
): void {
  Sentry.captureException(error, {
    tags: { feature: "notebooks", stage: `metric-${stage}-refresh` },
    extra: { communityId },
  });
}

async function fetchCatalog(communityId: string): Promise<NotebookMetricCatalogDto> {
  return api.get(INDEXER.V2.NOTEBOOK_METRICS.CATALOG(communityId), {
    schema: NotebookMetricCatalogDtoSchema,
    isAuthorized: false,
    baseURL: notebookIndexerBaseUrl(),
  });
}

async function loadCatalog(communityId: string): Promise<NotebookMetricCatalog> {
  const key = communityId.toLowerCase();
  try {
    const dto = await fetchCatalog(communityId);
    if (!dto.community.variantUIDs.length) {
      throw new Error("Notebook metric catalog reconciliation failed: no community variants");
    }
    if (new Set(dto.items.map((item) => item.id)).size !== dto.items.length) {
      throw new Error("Notebook metric catalog reconciliation failed: repeated metric ids");
    }
    for (const item of dto.items) {
      if (!item.windows.allowed.includes(item.windows.default)) {
        throw new Error(
          `Notebook metric catalog reconciliation failed: ${item.id} default window is not allowed`
        );
      }
      for (const filter of item.filters) {
        if (filter.dimensions?.some((dimension) => !item.dimensions.includes(dimension))) {
          throw new Error(
            `Notebook metric catalog reconciliation failed: ${item.id} filter dimension is not selectable`
          );
        }
      }
    }
    const catalog: NotebookMetricCatalog = { ...dto, freshness: { stale: false } };
    lastGoodCatalog.set(key, catalog);
    return catalog;
  } catch (error) {
    const previous = lastGoodCatalog.get(key);
    if (!previous) throw error;
    reportRefreshFailure(communityId, "catalog", error);
    return { ...previous, freshness: { stale: true } };
  }
}

function canonicalFilters(filters: NotebookMetricQueryFilters = {}): NotebookMetricQueryFilters {
  const uniqueSorted = (values: string[] | undefined): string[] | undefined =>
    values ? [...new Set(values)].sort() : undefined;
  return {
    ...(filters.programIds ? { programIds: uniqueSorted(filters.programIds) } : {}),
    ...(filters.projectUIDs ? { projectUIDs: uniqueSorted(filters.projectUIDs) } : {}),
    ...(filters.aggregation ? { aggregation: filters.aggregation } : {}),
    ...(filters.tier ? { tier: uniqueSorted(filters.tier) } : {}),
    ...(filters.category ? { category: uniqueSorted(filters.category) } : {}),
    ...(filters.inScope !== undefined ? { inScope: filters.inScope } : {}),
  };
}

function queryParameters(input: NotebookMetricQueryInput): URLSearchParams {
  const parameters = new URLSearchParams({
    metricId: input.metricId,
    groupBy: input.groupBy,
    window: input.window,
  });
  const filters = canonicalFilters(input.filters);
  if (filters.programIds?.length) parameters.set("programIds", filters.programIds.join(","));
  if (filters.projectUIDs?.length) parameters.set("projectUIDs", filters.projectUIDs.join(","));
  if (filters.aggregation) parameters.set("aggregation", filters.aggregation);
  if (filters.tier?.length) parameters.set("tier", filters.tier.join(","));
  if (filters.category?.length) parameters.set("category", filters.category.join(","));
  if (filters.inScope !== undefined) parameters.set("inScope", String(filters.inScope));
  parameters.sort();
  return parameters;
}

function reconcileQueryEcho(
  input: NotebookMetricQueryInput,
  dto: NotebookMetricQueryResultDto
): void {
  if (
    dto.query.communityUidOrSlug.toLowerCase() !== input.communityId.toLowerCase() ||
    dto.query.metricId !== input.metricId ||
    dto.query.groupBy !== input.groupBy ||
    dto.query.window !== input.window
  ) {
    throw new Error("Notebook metric query reconciliation failed: response does not echo request");
  }
  if (
    JSON.stringify(canonicalFilters(dto.query.filters)) !==
    JSON.stringify(canonicalFilters(input.filters))
  ) {
    throw new Error(
      "Notebook metric query reconciliation failed: response filters differ from request"
    );
  }
  if (new Set(dto.rows.map((row) => row.key)).size !== dto.rows.length) {
    throw new Error("Notebook metric query reconciliation failed: repeated row keys");
  }
  for (const row of dto.rows) {
    if ((row.value === null) !== (row.displayValue === dto.meta.absenceDisplay)) {
      throw new Error(
        "Notebook metric query reconciliation failed: absent values must use the declared em dash"
      );
    }
  }
}

async function fetchQuery(
  input: NotebookMetricQueryInput,
  parameters: URLSearchParams
): Promise<NotebookMetricQueryResultDto> {
  return api.get(INDEXER.V2.NOTEBOOK_METRICS.QUERY(input.communityId, parameters.toString()), {
    schema: NotebookMetricQueryResultDtoSchema,
    isAuthorized: false,
    baseURL: notebookIndexerBaseUrl(),
  });
}

async function loadQuery(
  input: NotebookMetricQueryInput,
  parameters: URLSearchParams
): Promise<NotebookMetricQueryResult> {
  const key = `${input.communityId.toLowerCase()}:${parameters.toString()}`;
  try {
    const dto = await fetchQuery(input, parameters);
    reconcileQueryEcho(input, dto);
    const result: NotebookMetricQueryResult = {
      ...dto,
      meta: { ...dto.meta, stale: false },
    };
    lastGoodQuery.set(key, result);
    return result;
  } catch (error) {
    const previous = lastGoodQuery.get(key);
    if (!previous) throw error;
    reportRefreshFailure(input.communityId, "query", error);
    return { ...previous, meta: { ...previous.meta, stale: true } };
  }
}

/** Community-scoped picker/AI vocabulary. Cross-community metrics never reach callers. */
export async function getNotebookMetricCatalog(
  communityId: string
): Promise<NotebookMetricCatalog> {
  const validated = CommunityIdSchema.parse(communityId);
  return unstable_cache(
    () => loadCatalog(validated),
    ["notebook-metric-catalog", METRIC_QUERY_SHAPE_VERSION, validated.toLowerCase()],
    { revalidate: METRIC_REVALIDATE_SECONDS, tags: [notebookMetricTag(validated)] }
  )();
}

/** Closed, cache-friendly metric resolver shared by builder server code and rendering. */
export async function queryNotebookMetric(
  input: NotebookMetricQueryInput
): Promise<NotebookMetricQueryResult> {
  const validated = QueryInputSchema.parse(input);
  const normalized: NotebookMetricQueryInput = {
    ...validated,
    filters: canonicalFilters(validated.filters),
  };
  const parameters = queryParameters(normalized);
  return unstable_cache(
    () => loadQuery(normalized, parameters),
    [
      "notebook-metric-query",
      METRIC_QUERY_SHAPE_VERSION,
      normalized.communityId.toLowerCase(),
      parameters.toString(),
    ],
    { revalidate: METRIC_REVALIDATE_SECONDS, tags: [notebookMetricTag(normalized.communityId)] }
  )();
}
