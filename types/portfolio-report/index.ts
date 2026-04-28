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
  reportType?: string;
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
}
