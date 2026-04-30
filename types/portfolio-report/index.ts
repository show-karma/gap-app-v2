export interface ReportConfig {
  id: string;
  communityId: string;
  programIds: string[];
  name: string;
  modelId: string;
  prompt: string;
  /** 1..28 — fires once per matching day each month (e.g. [1] = monthly, [1,15] = twice). */
  daysOfMonth: number[];
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
  daysOfMonth: number[];
  isActive?: boolean;
}

export interface UpdateReportConfigRequest {
  name?: string;
  programIds?: string[];
  modelId?: string;
  prompt?: string;
  daysOfMonth?: number[];
  isActive?: boolean;
}

export interface GenerateReportRequest {
  configId: string;
}
