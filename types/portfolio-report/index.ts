export type ScheduleIntervalUnit = "days" | "weeks" | "months";

export type ScheduleEnds =
  | { kind: "never" }
  | { kind: "on_date"; date: string }; // ISO YYYY-MM-DD, inclusive

export interface ReportSchedule {
  intervalUnit: ScheduleIntervalUnit;
  /** Positive integer; e.g. 1 for "every day", 2 for "every two weeks". */
  intervalCount: number;
  /** ISO YYYY-MM-DD — recurrence anchor. First fire is on this date. */
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

/**
 * `runDate` is the ISO `YYYY-MM-DD` date the report was generated.
 * Pair `(reportConfigId, runDate)` is unique — re-running on the same day
 * overwrites the prior draft.
 */
export interface PortfolioReport {
  id: string;
  reportConfigId: string;
  communityId: string;
  runDate: string;
  status: "draft" | "published";
  markdown: string;
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
