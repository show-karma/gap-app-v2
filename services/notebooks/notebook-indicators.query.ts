import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookIndicatorCatalogDto,
  NotebookIndicatorCatalogDtoSchema,
  type NotebookIndicatorDatapointDto,
  type NotebookIndicatorDatapointsDto,
  NotebookIndicatorDatapointsDtoSchema,
  type NotebookIndicatorDto,
  NotebookIndicatorDtoSchema,
} from "./notebook-indicators.dto";
import {
  NOTEBOOK_TIME_RANGE_PRESETS,
  type NotebookIndicatorCatalog,
  type NotebookIndicatorOption,
  type NotebookIndicatorSeries,
  type NotebookTimeRangePreset,
  type NotebookTimeSeriesPoint,
} from "./notebook-indicators.types";

const IndicatorIdSchema = z.string().uuid();
const ProjectUidSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "invalid project UID");
const TimeRangePresetSchema = z.enum(NOTEBOOK_TIME_RANGE_PRESETS);
const PAGE_SIZE = 100;
const PAGE_CONCURRENCY = 10;
const INDICATOR_QUERY_SHAPE_VERSION = "v1";
const INDICATOR_REVALIDATE_SECONDS = 3600;

function catalogEndpoint(page: number): string {
  return INDEXER.INDICATORS.V2.LIST({ page, limit: PAGE_SIZE });
}

async function fetchCatalogPage(page: number): Promise<NotebookIndicatorCatalogDto> {
  return api.get(catalogEndpoint(page), {
    schema: NotebookIndicatorCatalogDtoSchema,
    isAuthorized: false,
  });
}

async function fetchRemainingPages<T>(
  totalPages: number,
  fetchPage: (page: number) => Promise<T>
): Promise<T[]> {
  const pages: T[] = [];
  for (let firstPage = 2; firstPage <= totalPages; firstPage += PAGE_CONCURRENCY) {
    const lastPage = Math.min(totalPages, firstPage + PAGE_CONCURRENCY - 1);
    const batch = await Promise.all(
      Array.from({ length: lastPage - firstPage + 1 }, (_, index) => fetchPage(firstPage + index))
    );
    pages.push(...batch);
  }
  return pages;
}

function assertCompletePagination(
  pages: Array<{ pagination: NotebookIndicatorCatalogDto["pagination"] }>,
  subject: string
): void {
  const first = pages[0];
  if (!first) throw new Error(`${subject} reconciliation failed: no first page`);

  const expectedPages = Math.max(1, first.pagination.totalPages);
  if (pages.length !== expectedPages) {
    throw new Error(
      `${subject} reconciliation failed: received ${pages.length} pages, expected ${expectedPages}`
    );
  }

  pages.forEach((page, index) => {
    if (
      page.pagination.page !== index + 1 ||
      page.pagination.totalCount !== first.pagination.totalCount ||
      page.pagination.totalPages !== first.pagination.totalPages
    ) {
      throw new Error(`${subject} reconciliation failed: inconsistent page ${index + 1}`);
    }
  });
}

async function loadIndicatorCatalog(): Promise<NotebookIndicatorCatalog> {
  const firstPage = await fetchCatalogPage(1);
  const remainingPages = await fetchRemainingPages(
    firstPage.pagination.totalPages,
    fetchCatalogPage
  );
  const pages = [firstPage, ...remainingPages];
  assertCompletePagination(pages, "Indicator catalog");
  const dtos = pages.flatMap((page) => page.payload);
  const uniqueIds = new Set(dtos.map((indicator) => indicator.id));

  if (dtos.length !== firstPage.pagination.totalCount || uniqueIds.size !== dtos.length) {
    throw new Error(
      `Indicator catalog reconciliation failed: received ${dtos.length} rows (${uniqueIds.size} unique), expected ${firstPage.pagination.totalCount}`
    );
  }

  const indicators: NotebookIndicatorOption[] = dtos
    .map((indicator) => ({
      id: indicator.id,
      label: indicator.name,
      description: indicator.description,
      unit: indicator.unitOfMeasure,
      kernelId: indicator.kernelId,
      communityUID: indicator.communityUID,
      syncType: indicator.syncType ?? null,
    }))
    .sort(
      (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id)
    );

  return { total: indicators.length, indicators };
}

/** All indicators available to the builder's picker, not only the API's first page. */
export async function getNotebookIndicatorCatalog(): Promise<NotebookIndicatorCatalog> {
  return unstable_cache(
    loadIndicatorCatalog,
    ["notebook-indicator-catalog", INDICATOR_QUERY_SHAPE_VERSION],
    { revalidate: INDICATOR_REVALIDATE_SECONDS, tags: ["notebook-indicators"] }
  )();
}

interface NotebookIndicatorSeriesOptions {
  projectUID?: string;
}

function datapointsEndpoint(indicatorId: string, page: number, projectUID?: string): string {
  return INDEXER.INDICATORS.V2.DATAPOINTS(indicatorId, {
    ...(projectUID ? { projectUID } : {}),
    page,
    limit: PAGE_SIZE,
  });
}

async function fetchDatapointsPage(
  indicatorId: string,
  page: number,
  projectUID?: string
): Promise<NotebookIndicatorDatapointsDto> {
  return api.get(datapointsEndpoint(indicatorId, page, projectUID), {
    schema: NotebookIndicatorDatapointsDtoSchema,
    isAuthorized: false,
  });
}

function pointFromDto(datapoint: NotebookIndicatorDatapointDto): NotebookTimeSeriesPoint | null {
  const rawValue = datapoint.value?.trim();
  if (!rawValue) return null;

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;

  return { date: datapoint.endDate.slice(0, 10), value };
}

function cutoffForPreset(preset: NotebookTimeRangePreset, now: Date): string | null {
  if (preset === "all") return null;

  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (preset === "12m") {
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  } else {
    cutoff.setUTCDate(cutoff.getUTCDate() - (preset === "30d" ? 29 : 89));
  }
  return cutoff.toISOString().slice(0, 10);
}

function normalizePoints(
  datapoints: NotebookIndicatorDatapointDto[],
  preset: NotebookTimeRangePreset
): Pick<
  NotebookIndicatorSeries,
  "points" | "latestPoint" | "receivedPointCount" | "discardedPointCount" | "supersededPointCount"
> {
  const byDate = new Map<
    string,
    { point: NotebookTimeSeriesPoint; updatedAtMs: number; wireIndex: number }
  >();
  let discardedPointCount = 0;
  let supersededPointCount = 0;

  datapoints.forEach((datapoint, wireIndex) => {
    const point = pointFromDto(datapoint);
    if (!point) {
      discardedPointCount += 1;
      return;
    }

    const existing = byDate.get(point.date);
    const updatedAtMs = Date.parse(datapoint.updatedAt);
    if (existing) supersededPointCount += 1;
    if (
      !existing ||
      updatedAtMs > existing.updatedAtMs ||
      (updatedAtMs === existing.updatedAtMs && wireIndex > existing.wireIndex)
    ) {
      byDate.set(point.date, { point, updatedAtMs, wireIndex });
    }
  });

  const allPoints = [...byDate.values()]
    .map((entry) => entry.point)
    .sort((left, right) => left.date.localeCompare(right.date));
  const latestPoint = allPoints.at(-1) ?? null;
  const cutoff = cutoffForPreset(preset, new Date());

  return {
    points: cutoff === null ? allPoints : allPoints.filter((point) => point.date >= cutoff),
    latestPoint,
    receivedPointCount: datapoints.length,
    discardedPointCount,
    supersededPointCount,
  };
}

function toSeriesIndicator(indicator: NotebookIndicatorDto): NotebookIndicatorSeries["indicator"] {
  return {
    id: indicator.id,
    label: indicator.name,
    description: indicator.description,
    unit: indicator.unitOfMeasure,
    kernelId: indicator.kernelId,
    communityUID: indicator.communityUID,
  };
}

async function loadIndicatorSeries(
  indicatorId: string,
  preset: NotebookTimeRangePreset,
  projectUID?: string
): Promise<NotebookIndicatorSeries> {
  const [indicator, firstPage] = await Promise.all([
    api.get<NotebookIndicatorDto>(INDEXER.INDICATORS.V2.GET_BY_ID(indicatorId), {
      schema: NotebookIndicatorDtoSchema,
      isAuthorized: false,
    }),
    fetchDatapointsPage(indicatorId, 1, projectUID),
  ]);
  const remainingPages = await fetchRemainingPages(firstPage.pagination.totalPages, (page) =>
    fetchDatapointsPage(indicatorId, page, projectUID)
  );
  const pages = [firstPage, ...remainingPages];
  assertCompletePagination(pages, "Indicator series");
  const datapoints = pages.flatMap((page) => page.payload);

  if (indicator.id !== indicatorId) {
    throw new Error(
      `Indicator series reconciliation failed: requested ${indicatorId}, received ${indicator.id}`
    );
  }

  if (datapoints.length !== firstPage.pagination.totalCount) {
    throw new Error(
      `Indicator series reconciliation failed: received ${datapoints.length} rows, expected ${firstPage.pagination.totalCount}`
    );
  }

  return {
    indicator: toSeriesIndicator(indicator),
    preset,
    ...normalizePoints(datapoints, preset),
  };
}

/**
 * One indicator's renderer-ready numeric series. String coercion, correction
 * de-duplication, pagination and range filtering all stay on this server seam.
 */
export async function getNotebookIndicatorSeries(
  indicatorId: string,
  preset: NotebookTimeRangePreset = "all",
  options: NotebookIndicatorSeriesOptions = {}
): Promise<NotebookIndicatorSeries> {
  const validatedIndicatorId = IndicatorIdSchema.parse(indicatorId);
  const validatedPreset = TimeRangePresetSchema.parse(preset);
  const projectUID = options.projectUID ? ProjectUidSchema.parse(options.projectUID) : undefined;
  const projectCacheKey = projectUID ?? "all-projects";

  return unstable_cache(
    () => loadIndicatorSeries(validatedIndicatorId, validatedPreset, projectUID),
    [
      "notebook-indicator-series",
      INDICATOR_QUERY_SHAPE_VERSION,
      validatedIndicatorId,
      projectCacheKey,
      validatedPreset,
    ],
    {
      revalidate: INDICATOR_REVALIDATE_SECONDS,
      tags: ["notebook-indicators", `notebook-indicator:${validatedIndicatorId}`],
    }
  )();
}
