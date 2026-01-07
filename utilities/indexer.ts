import type { Hex } from "viem";

export const INDEXER = {
  ATTESTATION_LISTENER: (hash: Hex | string, chainId: number) =>
    `/attestations/index-by-transaction/${hash}/${chainId}`,
  ATTESTATIONS: {
    GET: (uid: string, chainId?: number) =>
      `/attestations/${uid}${chainId ? `?chainId=${chainId}` : ""}`,
  },
  PROFILE: {
    GET: (address: string) => `/user/${address}`,
  },
  REGISTRY: {
    GET_ALL: "/registry",
    FIND_BY_ID: (id: string, chainId: number) => `/registry/find/${id}/${chainId}`,
    GET_ALL_PENDING: "/registry/pending",
    APPROVE: "/registry/approve",
    UPDATE: (id: string, chainId: number) => `/registry/${id}/${chainId}/updateMetadata`,
    CREATE: "/registry/offchain/create",
    MANAGERS: (profileId: string, chainId: number) =>
      `/registry/profile/${profileId}/${chainId}/members`,
    V2: {
      CREATE: "/v2/program-registry",
      UPDATE: (programId: string) => `/v2/program-registry/${programId}`,
      APPROVE: "/v2/program-registry/approve",
      GET_BY_ID: (programId: string) => `/v2/program-registry/${programId}`,
      SEARCH: "/v2/program-registry/search",
      FILTERS: "/v2/program-registry/filters",
      GET_ALL: (params?: {
        page?: number;
        limit?: number;
        isValid?: "true" | "false" | "null" | "accepted" | "rejected" | "pending" | "all";
        offChain?: boolean;
        chainID?: number;
        name?: string;
        networks?: string;
        ecosystems?: string;
        grantTypes?: string;
        sortField?: "createdAt" | "updatedAt" | "name" | "programId";
        sortOrder?: "asc" | "desc";
        owners?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.isValid) queryParams.set("isValid", params.isValid);
        if (params?.offChain !== undefined) queryParams.set("offChain", params.offChain.toString());
        if (params?.chainID) queryParams.set("chainID", params.chainID.toString());
        if (params?.name) queryParams.set("name", params.name);
        if (params?.networks) queryParams.set("networks", params.networks);
        if (params?.ecosystems) queryParams.set("ecosystems", params.ecosystems);
        if (params?.grantTypes) queryParams.set("grantTypes", params.grantTypes);
        if (params?.sortField) queryParams.set("sortField", params.sortField);
        if (params?.sortOrder) queryParams.set("sortOrder", params.sortOrder);
        if (params?.owners) queryParams.set("owners", params.owners);
        const query = queryParams.toString();
        return `/v2/program-registry${query ? `?${query}` : ""}`;
      },
      GET_PENDING: (limit?: number, offset?: number) => {
        const params = new URLSearchParams();
        if (limit) params.set("limit", limit.toString());
        if (offset) params.set("offset", offset.toString());
        return `/v2/program-registry/pending${params.toString() ? `?${params.toString()}` : ""}`;
      },
    },
  },
  PROJECTS: {
    GET_ALL: (offset: number, limit: number, sortField: string, sortOrder: "asc" | "desc") =>
      `/projects/list?offset=${offset}&limit=${limit}${
        sortField ? `&sortField=${sortField}` : ""
      }${sortOrder ? `&sortOrder=${sortOrder}` : ""}`,
    BY_PROGRAM: (programId: string, chainId: number, communityId: string) =>
      `/projects/by-program?programId=${programId}&chainId=${chainId}&communityId=${communityId}`,
    TRACKS: (projectId: string) => `/tracks/projects/${projectId}/tracks`,
  },
  V2: {
    PROJECTS: {
      GET: (projectIdOrSlug: string) => `/v2/projects/${projectIdOrSlug}`,
      SLUG_CHECK: (slug: string) => `/v2/projects/slug/check/${slug}`,
      SEARCH: (query: string, limit?: number) =>
        `/v2/projects?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ""}`,
      GRANTS: (projectIdOrSlug: string) => `/v2/projects/${projectIdOrSlug}/grants`,
      GRANT_MILESTONES: (projectUid: string, programId: string) =>
        `/v2/projects/${projectUid}/grants/${programId}/milestones`,
      UPDATES: (projectIdOrSlug: string) => `/v2/projects/${projectIdOrSlug}/updates`,
      MILESTONES: (projectIdOrSlug: string) => `/v2/projects/${projectIdOrSlug}/milestones`,
      IMPACTS: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/impacts`,
    },
    APPLICATIONS: {
      BY_PROJECT_UID: (projectUID: string) => `/v2/funding-applications/project/${projectUID}`,
      COMMENTS: (applicationId: string) => `/v2/applications/${applicationId}/comments`,
      DELETE: (referenceNumber: string) => `/v2/funding-applications/${referenceNumber}`,
    },
    SEARCH: (query: string, limit: number = 10) =>
      `/v2/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    FUNDING_DETAILS: (programId: string, chainId: number) =>
      `/v2/program/funding-details?programId=${programId}&chainId=${chainId}`,
    FUNDING_PROGRAMS: {
      BY_COMMUNITY: (communityId: string) => `/v2/funding-program-configs/community/${communityId}`,
      GET: (programId: string) => `/v2/funding-program-configs/${programId}`,
      LIST: (community?: string) =>
        `/v2/funding-program-configs${community ? `?community=${community}` : ""}`,
      ENABLED: () => `/v2/funding-program-configs/enabled`,
      REVIEWERS: (programId: string) =>
        `/v2/funding-program-configs/${programId}/reviewers`,
      CHECK_PERMISSION: (programId: string, action?: string) => {
        const params = new URLSearchParams();
        if (action) params.append("action", action);
        return `/v2/funding-program-configs/${programId}/check-permission?${params.toString()}`;
      },
      MY_REVIEWER_PROGRAMS: () => `/v2/funding-program-configs/my-reviewer-programs`,
    },
    FUNDING_APPLICATIONS: {
      GET: (applicationId: string) => `/v2/funding-applications/${applicationId}`,
      BY_PROGRAM: (programId: string) =>
        `/v2/funding-applications/program/${programId}`,
      BY_EMAIL: (programId: string, email: string) =>
        `/v2/funding-applications/program/${programId}/by-email?email=${encodeURIComponent(email)}`,
      STATISTICS: (programId: string) =>
        `/v2/funding-applications/program/${programId}/statistics`,
      EXPORT: (programId: string) =>
        `/v2/funding-applications/program/${programId}/export`,
      ADMIN_EXPORT: (programId: string) =>
        `/v2/funding-applications/admin/${programId}/export`,
      VERSIONS_TIMELINE: (referenceNumber: string) =>
        `/v2/funding-applications/${referenceNumber}/versions/timeline`,
      REVIEWERS: (applicationId: string) => `/v2/funding-applications/${applicationId}/reviewers`,
    },
    USER: {
      PERMISSIONS: (resource?: string) => {
        const params = new URLSearchParams();
        if (resource) params.append("resource", resource);
        return `/v2/user/permissions?${params.toString()}`;
      },
      ADMIN_COMMUNITIES: () => `/v2/user/communities/admin`,
      PROJECTS: (page?: number, limit?: number) => {
        const params = new URLSearchParams();
        if (page !== undefined) params.set("page", page.toString());
        if (limit !== undefined) params.set("limit", limit.toString());
        return `/v2/user/projects${params.toString() ? `?${params.toString()}` : ""}`;
      },
    },
    MILESTONE_REVIEWERS: {
      LIST: (programId: string) =>
        `/v2/programs/${programId}/milestone-reviewers`,
    },
    REGISTRY: {
      GET_ALL: "/v2/program-registry/search",
      GET_BY_ID: (programId: string) => `/v2/program-registry/${programId}`,
      GET_FILTERS: "/v2/program-registry/filters",
    },
    TRACKS: {
      LIST: (communityUID: string, includeArchived?: boolean) => {
        const params = new URLSearchParams({ communityUID });
        if (includeArchived) params.set("includeArchived", "true");
        return `/v2/tracks?${params.toString()}`;
      },
      BY_ID: (id: string) => `/v2/tracks/${id}`,
      CREATE: () => `/v2/tracks`,
      UPDATE: (id: string) => `/v2/tracks/${id}`,
      ARCHIVE: (id: string) => `/v2/tracks/${id}`,
      PROGRAM_TRACKS: (programId: string) => `/v2/programs/${programId}/tracks`,
      ASSIGN_TO_PROGRAM: (programId: string) => `/v2/programs/${programId}/tracks`,
      UNASSIGN_FROM_PROGRAM: (programId: string, trackId: string) =>
        `/v2/programs/${programId}/tracks/${trackId}`,
      PROJECT_TRACKS: (projectId: string, programId: string) =>
        `/v2/projects/${projectId}/programs/${programId}/tracks`,
      ASSIGN_TO_PROJECT: (projectId: string) => `/v2/projects/${projectId}/tracks`,
      UNASSIGN_FROM_PROJECT: (programId: string, projectId: string) =>
        `/v2/programs/${programId}/projects/${projectId}/tracks`,
      PROJECTS_BY_TRACK: (communityId: string, programId: string, trackId?: string) => {
        const base = `/v2/communities/${communityId}/programs/${programId}/projects`;
        return trackId ? `${base}?trackId=${trackId}` : base;
      },
    },
  },
  PROGRAMS: {
    GET: (programId: string) => `/programs/${programId}`,
    COMMUNITY: (communityId: string) => `/communities/${communityId}/programs`,
  },
  PROJECT: {
    EXTERNAL: {
      UPDATE: (projectUID: string) => `/projects/${projectUID}/external/update`,
    },
    CONTRACTS: {
      CHECK_ADDRESS: () => `/v2/projects/contracts/address-availability`,
      DEPLOYER: (network: string, contractAddress: string) =>
        `/v2/projects/contracts/deployer?network=${encodeURIComponent(network)}&contractAddress=${encodeURIComponent(contractAddress)}`,
      VERIFY_MESSAGE: () => `/v2/projects/contracts/verify-message`,
      VERIFY_SIGNATURE: () => `/v2/projects/contracts/verify-signature`,
    },
    SUBSCRIBE: (projectId: Hex) => `/projects/${projectId}/subscribe`,
    FEED: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/feed`,
    FUNDEDBY: (address: string) => `/projects/fundedby/${address}`,
    GRANTS_GENIE: (projectId: string) => `/projects/${projectId}/grants-genie`,
    REQUEST_INTRO: (projectIdOrSlug: string) => `/projects/requestintro/${projectIdOrSlug}`,
    ENDORSEMENT: {
      NOTIFY: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/endorsements/notify`,
    },
    ALL_REPORT: (offset: number, limit: number) =>
      `/projects/report?offset=${offset}&limit=${limit}`,
    REVOKE_ATTESTATION: (attestationUID: string | `0x${string}`, chainId: number) =>
      `/attestations/revoke/${attestationUID}/${chainId}`,
    INVITATION: {
      NEW_CODE: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/add-invite-link`,
      REVOKE_CODE: (projectIdOrSlug: string, code: string) =>
        `/projects/${projectIdOrSlug}/revoke-invite-link/${code}`,
      ACCEPT_LINK: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/accept-invite-link`,
      GET_LINKS: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/get-invite-link`,
      CHECK_CODE: (projectIdOrSlug: string, hash: string) =>
        `/projects/${projectIdOrSlug}/validate-invite-link/${hash}`,
    },
    CATEGORIES: {
      UPDATE: (projectUID: string) => `/projects/${projectUID}/update/categories`,
    },
    REGIONS: {
      UPDATE: (projectUID: string) => `/v2/projects/${projectUID}/regions`,
      GET: (projectUID: string) => `/projects/${projectUID}/regions`,
    },
    IMPACT_INDICATORS: {
      GET: (projectUID: string) => `/projects/${projectUID}/indicators/data/all`,
      SEND: (projectUID: string) => `/projects/${projectUID}/indicators/data`,
    },
    PAYOUT_ADDRESS: {
      UPDATE: (projectUID: string) => `/projects/${projectUID}/payout-address`,
      GET: (projectUID: string) => `/projects/${projectUID}/payout-address`,
    },
    CHAIN_PAYOUT_ADDRESS: {
      UPDATE: (projectId: string) => `/v2/projects/${projectId}/chain-payout-address`,
    },
    LOGOS: {
      PRESIGNED_URL: () => `/v2/projects/logos/presigned`,
      PROMOTE_TO_PERMANENT: () => `/v2/projects/logos/promote-to-permanent`,
    },
  },
  MILESTONE: {
    IMPACT_INDICATORS: {
      GET: (milestoneUID: string) => `/grants/milestones/${milestoneUID}/indicators/data`,
      SEND: (milestoneUID: string) => `/grants/milestones/${milestoneUID}/indicators/data`,
    },
  },
  CATEGORIES: {
    CREATE: (idOrSlug: string) => `/categories/create/${idOrSlug}`,
    IMPACT_SEGMENTS: {
      CREATE_OR_UPDATE: (categoryId: string) => `/categories/${categoryId}/impact-segments`,
      DELETE: (categoryId: string) => `/categories/${categoryId}/impact-segments`,
    },
  },
  REGIONS: {
    CREATE: (communityId: string) => `/v2/communities/${communityId}/regions`,
    UPDATE: (communityId: string, regionId: string) =>
      `/v2/communities/${communityId}/regions/${regionId}`,
    DELETE: (communityId: string, regionId: string) =>
      `/v2/communities/${communityId}/regions/${regionId}`,
    GET_BY_ID: (regionId: string) => `/v2/regions/${regionId}`,
  },
  INDICATORS: {
    CREATE_OR_UPDATE: () => `/indicators`,
    DELETE: (indicatorId: string) => `/indicators/${indicatorId}`,
    UNLINKED: () => `/indicators/unlinked`,
    BY_TIMERANGE: (projectUID: string, params: Record<string, number>) =>
      `/projects/${projectUID}/indicator-dashboard-metrics?${Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join("&")}`,
  },
  COMMUNITY: {
    LIST: ({ page, limit, includeStats }: { page: number; limit: number; includeStats: boolean }) =>
      `/v2/communities/?page=${page}&limit=${limit}&includeStats=${includeStats}`,
    CATEGORIES: (idOrSlug: string) => `/communities/${idOrSlug}/categories`,
    REGIONS: (idOrSlug: string) => `/v2/communities/${idOrSlug}/regions`,
    V2: {
      GET: (slug: string) => `/v2/communities/${slug}`,
      STATS: (slug: string) => `/v2/communities/${slug}/stats`,
      IMPACT_SEGMENTS: (communityUID: string) => `/v2/impact-segments/${communityUID}`,
      INDICATORS: {
        AGGREGATED: (
          indicatorIds: string,
          communityUID: string,
          programId?: string,
          projectUID?: string,
          startDate?: string,
          endDate?: string
        ) => {
          const params = new URLSearchParams({
            indicatorIds,
            communityUID,
          });

          if (programId) params.append("programId", programId);
          if (projectUID) params.append("projectUID", projectUID);
          if (startDate) params.append("startDate", startDate);
          if (endDate) params.append("endDate", endDate);

          return `/v2/indicators/aggregate?${params.toString()}`;
        },
      },
      PROJECTS: (
        slug: string,
        {
          page,
          limit,
          sortBy,
          categories,
          status,
          selectedProgramId,
          selectedTrackIds,
        }: {
          page?: number;
          limit?: number;
          sortBy?: string;
          categories?: string;
          status?: string;
          selectedProgramId?: string;
          selectedTrackIds?: string[];
        } = {}
      ) => {
        const params = new URLSearchParams();
        if (page !== undefined) params.set("page", page.toString());
        if (limit !== undefined) params.set("limit", limit.toString());
        if (sortBy) params.set("sortBy", sortBy);
        if (categories) params.set("categories", categories);
        if (status) params.set("status", status);
        if (selectedProgramId) params.set("programIds", selectedProgramId);
        if (selectedTrackIds?.length) params.set("trackIds", selectedTrackIds.join(","));
        const queryString = params.toString();
        return `/v2/communities/${slug}/projects${queryString ? `?${queryString}` : ""}`;
      },
    },
    SUBSCRIBE: {
      BULK: `/bulk-subscription/subscribe`,
    },
    REPORT: {
      GET: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}/report`,
    },
    PROGRAMS: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}/programs`,
    ALL_PROGRAMS_IMPACT_AGGREGATE: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/programs/impact-aggregate`,
    PROJECT_DISCOVERY: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/impact-discovery`,
    GRANTS: (
      communityIdOrSlug: string,
      {
        page,
        pageLimit,
        status,
        sort,
        categories,
        selectedProgramId,
        download,
        selectedTrackIds,
      }: {
        page?: number;
        pageLimit?: number;
        status?: string;
        sort?: string;
        categories?: string;
        selectedProgramId?: string;
        download?: boolean;
        selectedTrackIds?: string[];
      }
    ) =>
      `/communities/${communityIdOrSlug}/grants?${
        page || page === 0 ? `&page=${page}` : ""
      }${pageLimit ? `&pageLimit=${pageLimit}` : ""}${
        status ? `&status=${status}` : ""
      }${sort ? `&sort=${sort}` : ""}${
        categories ? `&categories=${categories}` : ""
      }${selectedProgramId ? `&selectedProgramIds=${selectedProgramId}` : ""}${
        download ? `&download=${download}` : ""
      }${selectedTrackIds ? `&selectedTrackIds=${selectedTrackIds}` : ""}`,
    STATS: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}/stats`,
    PAGE_HEADER_STATS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/page-header-stats`,
    GLOBAL_STATS: () => `/v2/communities/stats`,
    ADMINS: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}/admins`,
    BATCH_UPDATE: (idOrSlug: string) => `/communities/${idOrSlug}/batch-update`,
    INDICATORS: {
      COMMUNITY: {
        LIST: (communityId: string) => `/communities/${communityId}/impact-indicators`,
      },
      CATEGORY: {
        LIST: (categoryId: string) => `/category/${categoryId}/impact-indicators`,
      },
    },
    PROJECT_UPDATES: (communityIdOrSlug: string) =>
      `/v2/communities/${communityIdOrSlug}/project-updates`,
    CONFIG: {
      GET: (slug: string) => `/v2/community-configs/${slug}`,
      UPDATE: (slug: string) => `/v2/community-configs/${slug}`,
    },
  },
  GRANTS: {
    EXTERNAL_ADDRESS: {
      UPDATE: (grantUID: string) => `/grants/${grantUID}/external/update`,
    },
  },
  GAP: {
    STATS: `/attestations/stats`,
    WEEKLY_ACTIVE_USERS: `/attestations/wau`,
    GLOBAL_COUNT: `/attestations/global-count`,
  },
  SUBSCRIPTION: {
    GET: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/contacts`,
    CREATE: (idOrSlug: string) => `/projects/${idOrSlug}/add/contact`,
    UPDATE: (idOrSlug: string, contactId: string) =>
      `/projects/${idOrSlug}/update/contact/${contactId}`,
    DELETE: (idOrSlug: string) => `/projects/${idOrSlug}/delete/contact`,
  },
};
