export type DisbursementStatus = "NOT_STARTED" | "PARTIAL" | "FULL";

export interface CurrencyBreakdown {
  currency: string;
  tokenAddress: string | null;
  chainID: number;
  allocated: string;
  disbursed: string;
  remaining: string;
  grantCount: number;
}

export interface ProgramFinancialSummary {
  programId: string;
  programName: string;
  primaryCurrency: string;
  primaryTokenAddress: string | null;
  primaryChainID: number | null;
  totalAllocated: string;
  totalDisbursed: string;
  totalRemaining: string;
  projectCount: number;
  currencyBreakdown?: CurrencyBreakdown[];
}

export interface ProjectFinancialStatus {
  projectUID: string;
  projectName: string;
  projectSlug: string;
  logoUrl: string | null;
  grantUID: string;
  currency: string;
  tokenAddress: string | null;
  chainID: number;
  approved: string;
  disbursed: string;
  remaining: string;
  disbursementPercentage: number;
  disbursementStatus: DisbursementStatus;
  milestoneCompletion: number;
}

export interface ProgramFinancialsPagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProgramFinancialsResponse {
  summary: ProgramFinancialSummary;
  projects: ProjectFinancialStatus[];
  pagination: ProgramFinancialsPagination;
}
