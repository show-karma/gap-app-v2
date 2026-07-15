import type {
  ChartSectionData,
  CreateReportConfigRequest,
  GenerateReportRequest,
  PortfolioReport,
  ReportConfig,
  ReportExportDownload,
  ReportExportManifest,
  ReportSnapshotSource,
  UpdateReportConfigRequest,
} from "@/types/portfolio-report";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 60000);

// unauthenticated fetcher for public endpoints
async function fetchPublic<T>(url: string): Promise<T> {
  const res = await fetch(`${API_URL}${url}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Report Config ────────────────────────────────────────────

export async function getReportConfigs(communitySlug: string): Promise<ReportConfig[]> {
  const { data } = await apiClient.get(`/v2/communities/${communitySlug}/report-configs`);
  return data;
}

export async function getReportConfig(
  communitySlug: string,
  configId: string
): Promise<ReportConfig> {
  const { data } = await apiClient.get(
    `/v2/communities/${communitySlug}/report-configs/${configId}`
  );
  return data;
}

export async function createReportConfig(
  communitySlug: string,
  body: CreateReportConfigRequest
): Promise<ReportConfig> {
  const { data } = await apiClient.post(`/v2/communities/${communitySlug}/report-configs`, body);
  return data;
}

export async function updateReportConfig(
  communitySlug: string,
  configId: string,
  body: UpdateReportConfigRequest
): Promise<ReportConfig> {
  const { data } = await apiClient.put(
    `/v2/communities/${communitySlug}/report-configs/${configId}`,
    body
  );
  return data;
}

export async function deleteReportConfig(communitySlug: string, configId: string): Promise<void> {
  await apiClient.delete(`/v2/communities/${communitySlug}/report-configs/${configId}`);
}

// ── Reports ──────────────────────────────────────────────────

export async function listReports(
  communitySlug: string,
  status?: string
): Promise<PortfolioReport[]> {
  const query = status ? `?${new URLSearchParams({ status }).toString()}` : "";
  const { data } = await apiClient.get(`/v2/communities/${communitySlug}/reports${query}`);
  return data;
}

export async function getReport(communitySlug: string, reportId: string): Promise<PortfolioReport> {
  const { data } = await apiClient.get(`/v2/communities/${communitySlug}/reports/${reportId}`);
  return data;
}

/**
 * Charts payload — datapoints are queried live on the backend, scoped to the
 * report's frozen snapshot (indicator IDs + project list) and runDate.
 * Published reports are public; drafts require admin auth (handled by the
 * auth-aware client). Public reads fall back to plain fetch.
 */
export async function getReportCharts(
  communitySlug: string,
  reportId: string,
  options?: { authenticated?: boolean }
): Promise<ChartSectionData> {
  const path = `/v2/communities/${communitySlug}/reports/${reportId}/charts`;
  if (options?.authenticated === false) {
    return fetchPublic<ChartSectionData>(path);
  }
  const { data } = await apiClient.get(path);
  return data;
}

export async function updateReportContent(
  communitySlug: string,
  reportId: string,
  content: string
): Promise<PortfolioReport> {
  const { data } = await apiClient.put(`/v2/communities/${communitySlug}/reports/${reportId}`, {
    content,
  });
  return data;
}

export async function generateReport(
  communitySlug: string,
  body: GenerateReportRequest
): Promise<PortfolioReport> {
  const { data } = await apiClient.post(`/v2/communities/${communitySlug}/reports/generate`, body);
  return data;
}

export async function regenerateReport(
  communitySlug: string,
  reportId: string
): Promise<PortfolioReport> {
  const { data } = await apiClient.post(
    `/v2/communities/${communitySlug}/reports/${reportId}/regenerate`
  );
  return data;
}

export async function deleteReport(communitySlug: string, reportId: string): Promise<void> {
  await apiClient.delete(`/v2/communities/${communitySlug}/reports/${reportId}`);
}

export async function publishReport(
  communitySlug: string,
  reportId: string
): Promise<PortfolioReport> {
  const { data } = await apiClient.put(
    `/v2/communities/${communitySlug}/reports/${reportId}/publish`
  );
  return data;
}

export async function unpublishReport(
  communitySlug: string,
  reportId: string
): Promise<PortfolioReport> {
  const { data } = await apiClient.put(
    `/v2/communities/${communitySlug}/reports/${reportId}/unpublish`
  );
  return data;
}

// ── Public endpoints ─────────────────────────────────────────

export async function getPublishedReports(communitySlug: string): Promise<PortfolioReport[]> {
  return fetchPublic<PortfolioReport[]>(`/v2/communities/${communitySlug}/reports/published`);
}

/**
 * Fetch a published report by its run date (`YYYY-MM-DD`). Endpoint segment
 * is named `published/{runDate}` on the backend.
 */
export async function getPublishedReportByRunDate(
  communitySlug: string,
  runDate: string
): Promise<PortfolioReport | null> {
  const res = await fetch(
    `${API_URL}/v2/communities/${communitySlug}/reports/published/${encodeURIComponent(runDate)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<PortfolioReport>;
}

/**
 * Fetch the report a specific config published on `runDate`. Preferred over
 * {@link getPublishedReportByRunDate}: a run date identifies at most one report
 * *per config*, so the date alone cannot address a report when a community runs
 * two configs on the same day.
 */
export async function getPublishedReportByRunDateAndConfigSlug(
  communitySlug: string,
  runDate: string,
  configSlug: string
): Promise<PortfolioReport | null> {
  const res = await fetch(
    `${API_URL}/v2/communities/${communitySlug}/reports/published/${encodeURIComponent(
      runDate
    )}/${encodeURIComponent(configSlug)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<PortfolioReport>;
}

// ── Data export (admin-only) ─────────────────────────────────

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return match?.[1] ? match[1].replace(/['"]/g, "") : fallback;
}

function readSnapshotSource(headers: Record<string, unknown>): ReportSnapshotSource | null {
  const raw = headers["x-snapshot-source"];
  return raw === "generation" || raw === "live-recompute" ? raw : null;
}

function exportPath(communitySlug: string, reportId: string): string {
  return `/v2/communities/${encodeURIComponent(communitySlug)}/reports/${encodeURIComponent(reportId)}/export`;
}

/** List the data-bearing sections of a report — drives the export menu. */
export async function getReportExportManifest(
  communitySlug: string,
  reportId: string
): Promise<ReportExportManifest> {
  const { data } = await apiClient.get(`${exportPath(communitySlug, reportId)}?format=manifest`);
  return data;
}

/** Download one section's raw rows as CSV. */
export async function exportReportSection(
  communitySlug: string,
  reportId: string,
  section: string
): Promise<ReportExportDownload> {
  const response = await apiClient.get(
    `${exportPath(communitySlug, reportId)}?format=csv&section=${encodeURIComponent(section)}`,
    { responseType: "blob" }
  );
  return {
    blob: response.data,
    filename: parseFilename(response.headers["content-disposition"], `report-data_${section}.csv`),
    snapshotSource: readSnapshotSource(response.headers),
  };
}

/** Download every section's raw rows as a single JSON file. */
export async function exportReportAll(
  communitySlug: string,
  reportId: string
): Promise<ReportExportDownload> {
  const response = await apiClient.get(`${exportPath(communitySlug, reportId)}?format=json`, {
    responseType: "blob",
  });
  return {
    blob: response.data,
    filename: parseFilename(
      response.headers["content-disposition"],
      `report-data_${reportId}.json`
    ),
    snapshotSource: readSnapshotSource(response.headers),
  };
}
