/**
 * Donor-research API response types, mirroring the gap-indexer DTOs from
 * Phase A+B. Kept narrow — types describe only what the frontend consumes
 * from the wire, not the full domain model.
 */

export type DonorResearchRateLimitTier = "beta" | "standard" | "unlimited";

export type DonorResearchReportMode = "fast" | "deep";

export type DonorResearchReportStatus =
  | "pending"
  | "running_fast"
  | "fast_complete"
  | "enriching"
  | "re_enriching"
  | "complete"
  | "failed";

export type ComplianceVerdictKind = "verified" | "partial" | "flagged" | "disqualified";

export type ActivitySignalStatus = "ok" | "partial" | "scrape_failed" | "no_signal";

export type StateRegistrationStatus =
  | "verified"
  | "suspended"
  | "revoked"
  | "not_verified"
  | "data_not_yet_indexed";

export interface DonorAdvisor {
  id: string;
  privyUserId: string;
  displayName: string;
  orgName: string | null;
  timezone: string;
  rateLimitTier: DonorResearchRateLimitTier;
  createdAt: string;
  updatedAt: string;
}

export interface DonorResearchCounterChannel {
  used: number;
  cap: number | null;
}

export interface DonorResearchCountersSnapshot {
  advisorId: string;
  tier: DonorResearchRateLimitTier;
  fast: DonorResearchCounterChannel;
  deep: DonorResearchCounterChannel;
  resetsAt: string;
  degraded: boolean;
}

export interface DonorHandle {
  id: string;
  advisorId: string;
  opaqueLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonorHandleList {
  items: DonorHandle[];
  limit: number;
  offset: number;
}

export interface ResearchReportListItem {
  id: string;
  donorHandleId: string;
  criteriaId: string;
  mode: DonorResearchReportMode;
  status: DonorResearchReportStatus;
  hasShareToken: boolean;
  shareTokenExpiresAt: string | null;
  createdAt: string;
  fastCompletedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface ResearchReportList {
  items: ResearchReportListItem[];
  limit: number;
  offset: number;
}

export interface ResearchReportCandidate {
  fundingOrganizationId: string;
  ein: string | null;
  composite: number;
  scores: {
    freshness: number;
    impactRecency: number;
    donorMatch: number;
    compliance: number;
  };
  topThreeFlag: boolean;
  complianceVerdict: ComplianceVerdictKind;
  stateRegistrationStatus: StateRegistrationStatus;
  activitySignalStatus: ActivitySignalStatus;
  websiteLastUpdatedAt: string | null;
  socialLastPostAt: string | null;
  reasoningSummary: string | null;
  onePagerText: string | null;
  detailedText: string | null;
}

export interface ResearchReportDetail {
  id: string;
  advisorId: string;
  donorHandleId: string;
  criteriaId: string;
  mode: DonorResearchReportMode;
  status: DonorResearchReportStatus;
  hasShareToken: boolean;
  shareTokenExpiresAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  fastCompletedAt: string | null;
  completedAt: string | null;
  candidates: ResearchReportCandidate[];
}

export interface ReportCreateResponse {
  reportId: string;
  status: DonorResearchReportStatus;
  streamUrl: string;
}

export interface ShareTokenPayload {
  id: string;
  shareToken: string | null;
  shareTokenExpiresAt: string | null;
  shareDisplayName: string | null;
  shareIntroText: string | null;
  shareUrlPath: string;
}

export interface SharedReportPayload {
  report: {
    id: string;
    status: DonorResearchReportStatus;
    mode: DonorResearchReportMode;
    shareDisplayName: string | null;
    shareIntroText: string | null;
    shareTokenExpiresAt: string | null;
    reportFinalizedAt: string | null;
  };
  candidates: ResearchReportCandidate[];
}

export interface FastReportEvent {
  name:
    | "snapshot"
    | "pool_loaded"
    | "compliance_complete"
    | "activity_complete"
    | "ranking_complete"
    | "report_finalized"
    | "report_failed";
  reportId: string;
  data: Record<string, unknown>;
}
