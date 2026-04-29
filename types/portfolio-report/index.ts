export type ReportType = "portfolio_monthly" | "portfolio_biweekly";

export const REPORT_TYPES: readonly ReportType[] = [
  "portfolio_monthly",
  "portfolio_biweekly",
] as const;

export interface ReportConfig {
  id: string;
  communityId: string;
  programIds: string[];
  reportType: string;
  modelId: string;
  prompt: string;
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
 * `reportMonth` holds the period identifier whose format depends on the
 * config's `reportType`:
 *   - portfolio_monthly  → "YYYY-MM"
 *   - portfolio_biweekly → "YYYY-MM-H1" (1st–15th) or "YYYY-MM-H2" (16th–EOM)
 *
 * The field name predates biweekly support; we keep it for wire compatibility.
 */
export interface PortfolioReport {
  id: string;
  reportConfigId: string;
  communityId: string;
  reportMonth: string;
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
  programIds: string[];
  reportType?: ReportType;
  modelId: string;
  prompt: string;
  isActive?: boolean;
}

export interface UpdateReportConfigRequest {
  programIds?: string[];
  modelId?: string;
  prompt?: string;
  isActive?: boolean;
}

export interface GenerateReportRequest {
  month: string;
  configId?: string;
  reportType?: ReportType;
}
