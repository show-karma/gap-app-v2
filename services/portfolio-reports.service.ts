import type {
  CreateReportConfigRequest,
  GenerateReportRequest,
  PortfolioReport,
  ReportConfig,
  UpdateReportConfigRequest,
} from "@/types/portfolio-report";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 300000);

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

export async function updateReportMarkdown(
  communitySlug: string,
  reportId: string,
  markdown: string
): Promise<PortfolioReport> {
  const { data } = await apiClient.put(`/v2/communities/${communitySlug}/reports/${reportId}`, {
    markdown,
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
