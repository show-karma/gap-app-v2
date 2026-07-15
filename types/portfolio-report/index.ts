export type ScheduleIntervalUnit = "days" | "weeks" | "months";

export type ScheduleEnds = { kind: "never" } | { kind: "on_date"; date: string };

export interface ReportSchedule {
  intervalUnit: ScheduleIntervalUnit;
  intervalCount: number;
  startDate: string;
  ends: ScheduleEnds;
}

export interface ReportConfig {
  id: string;
  communityId: string;
  programIds: string[];
  name: string;
  modelId: string;
  prompt: string;
  chartIndicatorIds: string[];
  schedule: ReportSchedule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type PortfolioReportStatus = "generating" | "draft" | "failed" | "published";

export interface ChartSectionDataPoint {
  /** ISO date `YYYY-MM-DD` */
  date: string;
  value: number;
}

export interface ChartSectionProject {
  uid: string;
  title: string;
  points: ChartSectionDataPoint[];
}

export interface ChartSectionIndicator {
  id: string;
  name: string;
  unit: string;
  projects: ChartSectionProject[];
}

export interface ChartSectionData {
  indicators: ChartSectionIndicator[];
  /** ISO date `YYYY-MM-DD` — Jan 1 of `runDate.year` */
  startDate: string;
  /** ISO date `YYYY-MM-DD` — same as the report's runDate */
  endDate: string;
}

export interface PortfolioReport {
  id: string;
  reportConfigId: string;
  /**
   * Human-readable name from the originating ReportConfig (e.g.,
   * "Weekly Operations Recap"). Only populated by the public list
   * endpoint (`GET /communities/:slug/reports/published`); admin
   * endpoints leave it `undefined`. `null` when the originating config
   * has been deleted.
   */
  reportConfigName?: string | null;
  /**
   * URL segment identifying the originating ReportConfig. Needed because
   * `runDate` alone is ambiguous — two configs can publish on the same day.
   * Populated by the public list endpoint only; `null` when the config has
   * been deleted, in which case callers fall back to the run-date-only URL.
   */
  reportConfigSlug?: string | null;
  communityId: string;
  runDate: string;
  status: PortfolioReportStatus;
  /**
   * Rendered report body. New reports are full `<!DOCTYPE html>`
   * documents emitted by the agentic generator's structured-document
   * pipeline. Pre-migration rows carry markdown text (one-time
   * backfill converts them to HTML). The FE always renders this
   * inside a sandboxed frame, format-agnostic by design.
   */
  content: string;
  dataSnapshot: Record<string, unknown>;
  modelId: string;
  tokenUsage: TokenUsage | null;
  generatedAt: string;
  generationError: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isReportGenerating(report: PortfolioReport): boolean {
  return report.status === "generating";
}

export const GENERATING_POLL_INTERVAL_MS = 3000;

export function reportPollIntervalMs(report: PortfolioReport | undefined): number | false {
  return report && isReportGenerating(report) ? GENERATING_POLL_INTERVAL_MS : false;
}

export interface CreateReportConfigRequest {
  name: string;
  programIds: string[];
  modelId: string;
  prompt: string;
  chartIndicatorIds?: string[];
  schedule: ReportSchedule;
  isActive?: boolean;
}

export interface UpdateReportConfigRequest {
  name?: string;
  programIds?: string[];
  modelId?: string;
  prompt?: string;
  chartIndicatorIds?: string[];
  schedule?: ReportSchedule;
  isActive?: boolean;
}

export interface GenerateReportRequest {
  configId: string;
}

// ── Data export ──────────────────────────────────────────────

export type ReportExportFormat = "manifest" | "csv" | "json";

/**
 * Whether an export came from the report's generation-time snapshot
 * (`generation`) or a live recompute for a legacy report predating snapshots
 * (`live-recompute` — reflects current data, not the data at generation time).
 */
export type ReportSnapshotSource = "generation" | "live-recompute";

export interface ReportExportManifestEntry {
  key: string;
  title: string;
  rowCount: number;
}

export interface ReportExportManifest {
  snapshotSource: ReportSnapshotSource;
  sections: ReportExportManifestEntry[];
}

export interface ReportExportDownload {
  blob: Blob;
  filename: string;
  snapshotSource: ReportSnapshotSource | null;
}
