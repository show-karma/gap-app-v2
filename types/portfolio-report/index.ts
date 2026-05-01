export type ScheduleIntervalUnit = "days" | "weeks" | "months";

export type ScheduleEnds =
  | { kind: "never" }
  | { kind: "on_date"; date: string };

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
