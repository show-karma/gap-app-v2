import type { Query } from "@tanstack/react-query";

/**
 * Project query key prefixes that should be invalidated together
 * when project data changes (e.g., after mutations)
 */
const PROJECT_QUERY_PREFIXES = [
  "project",
  "project-updates",
  "project-impacts",
  "project-milestones",
  "project-grants",
  "projectMilestones", // Legacy key format - to be deprecated
] as const;

/**
 * Creates a predicate function for invalidating all queries related to a specific project.
 *
 * This is more efficient than invalidating each query type separately when multiple
 * project-related queries need to be refreshed (e.g., after a mutation).
 *
 * @param projectIdOrSlug - The project UID or slug to match against
 * @returns A predicate function for use with queryClient.invalidateQueries()
 *
 * @example
 * ```ts
 * // Invalidate all queries for a specific project
 * await queryClient.invalidateQueries({
 *   predicate: createProjectQueryPredicate(projectId)
 * });
 * ```
 *
 * Trade-offs vs explicit invalidation:
 * - Pros: Single call, automatically includes new query types, less maintenance
 * - Cons: May invalidate more queries than strictly necessary in some cases
 *
 * Use predicate invalidation when:
 * - Multiple related queries need invalidation (3+)
 * - After mutations that affect multiple data types
 *
 * Use explicit invalidation when:
 * - Only 1-2 specific queries need invalidation
 * - You need fine-grained control over what gets invalidated
 */
export const createProjectQueryPredicate = (projectIdOrSlug: string) => {
  return (query: Query): boolean => {
    const key = query.queryKey;
    if (!Array.isArray(key) || key.length === 0) return false;

    const firstKey = String(key[0]);

    // Check if this is a project-related query
    const isProjectQuery = PROJECT_QUERY_PREFIXES.some((prefix) => firstKey === prefix);
    if (!isProjectQuery) return false;

    // Check if the project ID matches (could be at index 1 or deeper in the key)
    // We check both uid and slug since either could be used
    const projectIdLower = projectIdOrSlug.toLowerCase();
    return key.some((keyPart, index) => {
      if (index === 0) return false; // Skip the prefix
      if (typeof keyPart !== "string") return false;
      return keyPart.toLowerCase() === projectIdLower;
    });
  };
};

/**
 * Centralized React Query keys for the application
 * Organized by feature/domain similar to INDEXER structure
 */
export const QUERY_KEYS = {
  /**
   * Authentication and authorization query keys
   * Used for permission checks (RBAC) and contract ownership
   */
  AUTH: {
    CONTRACT_OWNER: (address?: string, chainId?: number) =>
      ["contract-owner", address, chainId] as const,
    CONTRACT_OWNER_BASE: ["contract-owner"] as const,
    PERMISSIONS_BASE: ["permissions"] as const,
  },
  /**
   * Platform-wide (cross-community) aggregate stats. Kept under a distinct prefix so it
   * never collides with per-community stats (QUERY_KEYS.COMMUNITY.STATS), which previously
   * shared the bare ["community-stats"] key and risked cross-contaminating invalidations.
   */
  PLATFORM: {
    GLOBAL_STATS: ["platform-global-stats"] as const,
  },
  MILESTONES: {
    PROJECT_GRANT_MILESTONES: (projectId: string, programId: string) =>
      ["project-grant-milestones", projectId, programId] as const,
    EVALUATION: (milestoneUID: string) => ["milestone-evaluation", milestoneUID] as const,
  },
  APPLICATIONS: {
    BY_PROJECT_UID: (projectUID: string) => ["application-by-project-uid", projectUID] as const,
    GRANTEE_ACCESS: (address?: string, communitySlug?: string, programId?: string) =>
      [
        "application-grantee-access",
        address ?? null,
        communitySlug ?? null,
        programId ?? null,
      ] as const,
    GRANTEE_MILESTONE_ACCESS: (
      address?: string,
      communitySlug?: string,
      programId?: string,
      projectUid?: string
    ) =>
      [
        "application-grantee-milestone-access",
        address ?? null,
        communitySlug ?? null,
        programId ?? null,
        projectUid ?? null,
      ] as const,
    COMMENTS: (referenceNumber: string) => ["application-comments", referenceNumber] as const,
    INVOICE_CONFIG: (referenceNumber: string) =>
      ["applicationInvoiceConfig", referenceNumber] as const,
    GRANTEE_CONTACTS: (referenceNumber: string) =>
      ["application-grantee-contacts", referenceNumber] as const,
  },
  REVIEWERS: {
    PROGRAM: (programId: string) => ["program-reviewers", programId] as const,
    MILESTONE: (programId: string) => ["milestone-reviewers", programId] as const,
    COMMUNITY: (communityUID: string, programId?: string | null, search?: string | null) =>
      ["reviewers", "community", communityUID, programId ?? null, search ?? null] as const,
    COMMUNITY_PROGRAMS: (communityUID: string) =>
      ["reviewers", "community", communityUID, "programs"] as const,
  },
  CONTRACTS: {
    VALIDATION: {
      ALL: ["contract-validation"] as const,
      VALIDATE: (params: { address: string; network: string; excludeProjectId?: string }) =>
        ["contract-validation", params] as const,
    },
  },
  COMMUNITY: {
    DETAILS: (communityUIDorSlug?: string) => ["communityDetails", communityUIDorSlug] as const,
    DETAILS_V2: (communityUIDorSlug?: string) =>
      ["community-details-v2", communityUIDorSlug] as const,
    STATS: (communityUIDorSlug?: string) => ["community-stats", communityUIDorSlug] as const,
    PROJECTS: (slug: string, options?: unknown) =>
      ["community-projects-v2", slug, options] as const,
    GRANTS: (communitySlug: string) => ["community-grants", communitySlug] as const,
    // Kept as ["programs", "community", …] (the pre-consolidation value) so the
    // cache shared across all useCommunityPrograms consumers stays stable.
    PROGRAMS: (communityUIDorSlug: string) =>
      ["programs", "community", communityUIDorSlug] as const,
    CATEGORIES: (communityUIDorSlug?: string) =>
      ["communityCategories", communityUIDorSlug] as const,
    IS_ADMIN: (communityUid?: string, chainId?: number, address?: string, signer?: unknown) =>
      ["isCommunityAdmin", communityUid, chainId, address, signer] as const,
    IS_ADMIN_BASE: ["isCommunityAdmin"] as const,
    IS_ADMIN_OF_ANY: (communitiesKey?: string, walletsKey?: string, signer?: unknown) =>
      ["isCommunityAdmin", "ofAny", communitiesKey, walletsKey, signer] as const,
    REPORT_MILESTONES: (
      communityId: string,
      page: number,
      sortBy: string,
      sortOrder: string,
      programIds: string[],
      reviewerAddress?: string
    ) =>
      [
        "reportMilestones",
        communityId,
        page,
        sortBy,
        sortOrder,
        programIds,
        reviewerAddress,
      ] as const,
    PENDING_VERIFICATION: (
      communityId: string,
      page: number,
      programIds: string[],
      reviewerAddress?: string
    ) => ["pendingVerificationMilestones", communityId, page, programIds, reviewerAddress] as const,
    PROJECT_UPDATES: (
      communityId: string,
      filter: string,
      page: number,
      limit: number,
      programId?: string | null,
      projectId?: string | null,
      sortBy?: string | null,
      sortOrder?: string | null
    ) =>
      [
        "community-project-updates",
        communityId,
        filter,
        page,
        limit,
        programId ?? "",
        projectId ?? "",
        sortBy ?? "",
        sortOrder ?? "",
      ] as const,
  },
  KNOWLEDGE_BASE: {
    /** All knowledge-base queries — used as a predicate root for bulk
     *  invalidation when a community's KB changes after a mutation. */
    ALL: ["knowledge-base"] as const,
    SOURCES: (communityIdOrSlug: string) =>
      ["knowledge-base", "sources", communityIdOrSlug] as const,
    SOURCES_BASE: ["knowledge-base", "sources"] as const,
  },
  GRANTS: {
    COMMENTS: (projectUID: string, programId: string) =>
      ["grant-comments", projectUID, programId] as const,
    DUPLICATE_CHECK_BASE: ["duplicate-grant-check"] as const,
    DUPLICATE_CHECK: (params: {
      projectUid?: string;
      programId?: string;
      community: string;
      title: string;
    }) => ["duplicate-grant-check", params] as const,
  },
  DONATIONS: {
    MY: () => ["donations", "me"] as const,
    POLLING: (donationUid: string, chainId: number) =>
      ["donation", "polling", donationUid, chainId] as const,
    STATUS: (uid: string, chainId: number) => ["donation-status", uid, chainId] as const,
  },
  SETTINGS: {
    AVAILABLE_AI_MODELS: ["available-ai-models"] as const,
  },
  SEARCH: {
    PROJECTS: (query: string) => ["search-projects", query] as const,
  },
  PROJECT: {
    DETAILS: (projectIdOrSlug: string) => ["project", projectIdOrSlug] as const,
    UPDATES: (projectIdOrSlug: string) => ["project-updates", projectIdOrSlug] as const,
    IMPACTS: (projectIdOrSlug: string) => ["project-impacts", projectIdOrSlug] as const,
    MILESTONES: (projectIdOrSlug: string) => ["project-milestones", projectIdOrSlug] as const,
    GRANTS: (projectIdOrSlug: string) => ["project-grants", projectIdOrSlug] as const,
    /**
     * Permissions query key with normalized chainID (null instead of undefined)
     * to prevent query key instability when project data loads asynchronously.
     */
    PERMISSIONS: (params: {
      walletsKey: string | null;
      projectId: string | null;
      chainID: number | null;
      isAuth: boolean;
    }) =>
      [
        "project-permissions",
        params.walletsKey,
        params.projectId,
        params.chainID,
        params.isAuth,
      ] as const,
    EXPLORER: (search?: string) => ["projects-explorer", search] as const,
    EXPLORER_BASE: ["projects-explorer"] as const,
    EXPLORER_INFINITE: (params: {
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
      hasPayoutAddress?: boolean;
      page?: number;
    }) =>
      [
        "projects-explorer-infinite",
        params.search || "",
        params.sortBy || "updatedAt",
        params.sortOrder || "desc",
        params.limit ?? 50,
        params.hasPayoutAddress ?? false,
        params.page ?? 1,
      ] as const,
  },
  INDICATORS: {
    AUTOSYNCED: ["indicators", "autosynced"] as const,
    AGGREGATED: (params: {
      indicatorIds: string;
      communityId: string;
      programId: string;
      projectUID: string;
      timeframe: string;
    }) =>
      [
        "aggregated-indicators",
        params.indicatorIds,
        params.communityId,
        params.programId,
        params.projectUID,
        params.timeframe,
      ] as const,
  },
  FUNDING_PLATFORM: {
    APPLICATIONS: (programId: string, chainId: number, filters?: unknown) =>
      ["applications", programId, chainId, filters] as const,
    APPLICATION: (applicationId: string) => ["funding-application", applicationId] as const,
    APPLICATION_STATS: (programId: string, chainId: number) =>
      ["application-stats", programId, chainId] as const,
  },
  FINANCIALS: {
    PROGRAM: (programId: string) => ["program-financials", programId] as const,
  },
};
