/**
 * Nonprofit-diligence + advisor-intro indexer endpoints (DEV-428).
 *
 * Kept in a dedicated module rather than in `utilities/indexer.ts` (which is
 * already at its size limit) while still centralising the paths as constants —
 * never hardcode these `/v2/...` strings at call sites.
 */
export const DILIGENCE_ENDPOINTS = {
  // Advisor (authed):
  TEMPLATE: "/v2/donor-research/me/diligence-template",
  CANDIDATE: (reportId: string, candidateId: string) =>
    `/v2/donor-research/reports/${reportId}/candidates/${candidateId}/diligence`,
  REQUESTS: (reportId: string, candidateId: string) =>
    `/v2/donor-research/reports/${reportId}/candidates/${candidateId}/diligence-requests`,
  OUTREACH_PREVIEW: (reportId: string, candidateId: string, action: "diligence" | "intro") =>
    `/v2/donor-research/reports/${reportId}/candidates/${candidateId}/outreach-preview?action=${action}`,
  INTRO_REQUESTS: (reportId: string, candidateId: string) =>
    `/v2/donor-research/reports/${reportId}/candidates/${candidateId}/intro-requests`,
  // Public (token = capability, no auth):
  RESPONSE: (token: string) => `/v2/donor-research/diligence-response/${token}`,
} as const;
