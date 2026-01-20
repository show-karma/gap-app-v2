/**
 * Centralized React Query keys for the application
 * Organized by feature/domain similar to INDEXER structure
 */
export const QUERY_KEYS = {
  /**
   * Authentication and authorization query keys
   * Used for permission checks and staff authorization
   */
  AUTH: {
    STAFF_AUTHORIZATION: (address?: string) =>
      ["staffAuthorization", address?.toLowerCase()] as const,
    STAFF_AUTHORIZATION_BASE: ["staffAuthorization"] as const,
    CONTRACT_OWNER: (address?: string, chainId?: number) =>
      ["contract-owner", address, chainId] as const,
    CONTRACT_OWNER_BASE: ["contract-owner"] as const,
  },
  MILESTONES: {
    PROJECT_GRANT_MILESTONES: (projectId: string, programId: string) =>
      ["project-grant-milestones", projectId, programId] as const,
  },
  APPLICATIONS: {
    BY_PROJECT_UID: (projectUID: string) => ["application-by-project-uid", projectUID] as const,
    COMMENTS: (referenceNumber: string) => ["application-comments", referenceNumber] as const,
  },
  REVIEWERS: {
    PROGRAM: (programId: string) => ["program-reviewers", programId] as const,
    MILESTONE: (programId: string) => ["milestone-reviewers", programId] as const,
  },
  CONTRACTS: {
    DEPLOYER: (network: string, contractAddress: string) =>
      ["contract-deployer", network, contractAddress] as const,
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
    PROJECTS: (slug: string, options?: unknown) =>
      ["community-projects-v2", slug, options] as const,
    GRANTS: (communitySlug: string) => ["community-grants", communitySlug] as const,
    CATEGORIES: (communityUIDorSlug?: string) =>
      ["communityCategories", communityUIDorSlug] as const,
    IS_ADMIN: (communityUid?: string, chainId?: number, address?: string, signer?: unknown) =>
      ["isCommunityAdmin", communityUid, chainId, address, signer] as const,
    IS_ADMIN_BASE: ["isCommunityAdmin"] as const,
    PROJECT_UPDATES: (communityId: string, filter: string, page: number) =>
      ["community-project-updates", communityId, filter, page] as const,
  },
  GRANTS: {
    DUPLICATE_CHECK_BASE: ["duplicate-grant-check"] as const,
    DUPLICATE_CHECK: (params: {
      projectUid?: string;
      programId?: string;
      community: string;
      title: string;
    }) => ["duplicate-grant-check", params] as const,
  },
  DONATIONS: {
    BY_USER: (walletAddress: string) => ["donations", "user", walletAddress] as const,
    BY_PROJECT: (projectUID: string) => ["donations", "project", projectUID] as const,
  },
  SETTINGS: {
    AVAILABLE_AI_MODELS: ["available-ai-models"] as const,
  },
  SEARCH: {
    PROJECTS: (query: string) => ["search-projects", query] as const,
  },
  PROJECT: {
    UPDATES: (projectIdOrSlug: string) => ["project-updates", projectIdOrSlug] as const,
    IMPACTS: (projectIdOrSlug: string) => ["project-impacts", projectIdOrSlug] as const,
    MILESTONES: (projectIdOrSlug: string) => ["project-milestones", projectIdOrSlug] as const,
    GRANTS: (projectIdOrSlug: string) => ["project-grants", projectIdOrSlug] as const,
    EXPLORER: (search?: string) => ["projects-explorer", search] as const,
    EXPLORER_BASE: ["projects-explorer"] as const,
    EXPLORER_INFINITE: (params: { search?: string; sortBy?: string; sortOrder?: string }) =>
      [
        "projects-explorer-infinite",
        params.search || "",
        params.sortBy || "updatedAt",
        params.sortOrder || "desc",
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
};
