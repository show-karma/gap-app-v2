import type { IApplicationFilters } from "@/services/fundingPlatformService";

type ReviewerStatsFilter = Pick<IApplicationFilters, "reviewerAddress" | "reviewerAddresses">;

/**
 * React Query key factory for the funding-platform hooks. Keys are arrays so
 * the leading `[name, programId]` segments act as invalidation prefixes.
 */
export const QUERY_KEYS = {
  programs: (communityId: string) => ["grant-programs", communityId],
  programConfig: (programId: string) => ["program-config", programId],
  programStats: (programId: string) => ["program-stats", programId],
  applications: (programId: string, filters: IApplicationFilters) => [
    "applications",
    programId,
    filters,
  ],
  application: (applicationId: string) => ["funding-application", applicationId],
  applicationByReference: (referenceNumber: string) => [
    "application-by-reference",
    referenceNumber,
  ],
  applicationByEmail: (programId: string, email: string) => [
    "application-by-email",
    programId,
    email,
  ],
  // The optional reviewer filter is appended as a suffix so the prefix-based
  // invalidations (called without it) still match the scoped stats entries.
  applicationStats: (programId: string, reviewerFilter?: ReviewerStatsFilter) =>
    reviewerFilter
      ? ["application-stats", programId, reviewerFilter]
      : ["application-stats", programId],
  applicationComments: (applicationId: string, isAdmin?: boolean) => [
    "application-comments",
    applicationId,
    isAdmin,
  ],
  applicationVersions: (applicationIdOrReference: string) => [
    "application-versions",
    applicationIdOrReference,
  ],
};
