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
    PROGRAM: (programId: string, chainID: number) =>
      ["program-reviewers", programId, chainID] as const,
    MILESTONE: (programId: string, chainID: number) =>
      ["milestone-reviewers", programId, chainID] as const,
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
    PROJECT_UPDATES: (communityId: string, filter: string, page: number) =>
      ["community-project-updates", communityId, filter, page] as const,
  },
  GRANTS: {
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
};
