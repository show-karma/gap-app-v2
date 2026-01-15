/**
 * Centralized React Query keys for the application
 * Organized by feature/domain similar to INDEXER structure
 */
export const QUERY_KEYS = {
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
    IS_ADMIN: (
      communityUid?: string,
      chainId?: number,
      address?: string,
      isAuth?: boolean,
      signer?: unknown
    ) => ["isCommunityAdmin", communityUid, chainId, address, isAuth, signer] as const,
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
  INDICATORS: {
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
  PROJECT: {
    UPDATES: (projectIdOrSlug: string) => ["project-updates", projectIdOrSlug] as const,
    IMPACTS: (projectIdOrSlug: string) => ["project-impacts", projectIdOrSlug] as const,
    MILESTONES: (projectIdOrSlug: string) => ["project-milestones", projectIdOrSlug] as const,
    GRANTS: (projectIdOrSlug: string) => ["project-grants", projectIdOrSlug] as const,
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
