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
  schedule: ReportSchedule;
  isActive?: boolean;
}

export interface UpdateReportConfigRequest {
  name?: string;
  programIds?: string[];
  modelId?: string;
  prompt?: string;
  schedule?: ReportSchedule;
  isActive?: boolean;
}

export interface GenerateReportRequest {
  configId: string;
}
