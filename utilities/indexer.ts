import { Hex } from "viem";

export const INDEXER = {
  ATTESTATION_LISTENER: (hash: Hex | string, chainId: number) =>
    `/attestations/index-by-transaction/${hash}/${chainId}`,
  PROFILE: {
    GET: (address: string) => `/user/${address}`,
  },
  REGISTRY: {
    GET_ALL: "/registry",
    FIND_BY_ID: (id: string, chainId: number) =>
      `/registry/find/${id}/${chainId}`,
    GET_ALL_PENDING: "/registry/pending",
    APPROVE: "/registry/approve",
    UPDATE: "/registry/updateMetadata",
    CREATE: "/registry/offchain/create",
    MANAGERS: (profileId: string, chainId: number) =>
      `/registry/profile/${profileId}/${chainId}/members`,
  },
  PROJECTS: {
    GET_ALL: (
      offset: number,
      limit: number,
      sortField: string,
      sortOrder: "asc" | "desc"
    ) =>
      `/projects/list?offset=${offset}&limit=${limit}${
        sortField ? `&sortField=${sortField}` : ""
      }${sortOrder ? `&sortOrder=${sortOrder}` : ""}`,
    BY_PROGRAM: (programId: string, chainId: number) =>
      `/projects/by-program?programId=${programId}&chainId=${chainId}`,
  },
  PROJECT: {
    SUBSCRIBE: (projectId: Hex) => `/projects/${projectId}/subscribe`,
    GET: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}`,
    FEED: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/feed`,
    FUNDEDBY: (address: string) => `/projects/fundedby/${address}`,
    GRANTS_GENIE: (projectId: string) => `/projects/${projectId}/grants-genie`,
    REQUEST_INTRO: (projectIdOrSlug: string) =>
      `/projects/requestintro/${projectIdOrSlug}`,
    ALL_REPORT: (offset: number, limit: number) =>
      `/projects/report?offset=${offset}&limit=${limit}`,
    REVOKE_ATTESTATION: (
      attestationUID: string | `0x${string}`,
      chainId: number
    ) => `/attestations/revoke/${attestationUID}/${chainId}`,
    INVITATION: {
      NEW_CODE: (projectIdOrSlug: string) =>
        `/projects/${projectIdOrSlug}/add-invite-link`,
      REVOKE_CODE: (projectIdOrSlug: string, code: string) =>
        `/projects/${projectIdOrSlug}/revoke-invite-link/${code}`,
      ACCEPT_LINK: (projectIdOrSlug: string) =>
        `/projects/${projectIdOrSlug}/accept-invite-link`,
      GET_LINKS: (projectIdOrSlug: string) =>
        `/projects/${projectIdOrSlug}/get-invite-link`,
      CHECK_CODE: (projectIdOrSlug: string, hash: string) =>
        `/projects/${projectIdOrSlug}/validate-invite-link/${hash}`,
    },
    CATEGORIES: {
      UPDATE: (projectUID: string) =>
        `/projects/${projectUID}/update/categories`,
    },
    IMPACT_INDICATORS: {
      GET: (projectUID: string) => `/projects/${projectUID}/indicators/data`,
      SEND: (projectUID: string) => `/projects/${projectUID}/indicators/data`,
    },
  },
  CATEGORIES: {
    CREATE: (idOrSlug: string) => `/categories/create/${idOrSlug}`,
    IMPACT_SEGMENTS: {
      CREATE_OR_UPDATE: (categoryId: string) =>
        `/categories/${categoryId}/impact-segments`,
      DELETE: (categoryId: string) =>
        `/categories/${categoryId}/impact-segments`,
    },
  },
  COMMUNITY: {
    GET: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}`,
    CATEGORIES: (idOrSlug: string) => `/communities/${idOrSlug}/categories`,
    SUBSCRIBE: {
      BULK: `/communities/subscribe/bulk`,
    },
    REPORT: {
      GET: (communityIdOrSlug: string) =>
        `/communities/${communityIdOrSlug}/report`,
    },
    GRANT_TITLES: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/grant-titles`,
    GRANT_CATEGORIES: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/grant-categories`,
    GRANT_PROGRAMS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/grant-programs`,
    GRANT_PROGRAMS_STATS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/grant-programs/stats`,
    GRANT_PROGRAMS_STATS_TOTAL: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/grant-programs/stats/total`,
    PROGRAMS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/programs`,
    PROGRAM_IMPACT: (communityIdOrSlug: string, programId: string) =>
      `/communities/${communityIdOrSlug}/programs/${programId}/outputs`,
    ALL_PROGRAMS_IMPACT: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/programs/outputs`,
    ALL_PROGRAMS_IMPACT_AGGREGATE: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/programs/outputs-aggregate`,
    PROJECT_DISCOVERY: (communityIdOrSlug: string, programId: string) =>
      `/communities/${communityIdOrSlug}/programs/${programId}/project-impact-discovery`,
    GRANTS: (
      communityIdOrSlug: string,
      {
        page,
        pageLimit,
        categories,
        sort,
        status,
        selectedProgramId,
      }: {
        page?: number;
        pageLimit?: number;
        categories?: string;
        sort?: string;
        status?: string;
        selectedProgramId?: string;
      }
    ) =>
      `/communities/${communityIdOrSlug}/grants?${
        page || page === 0 ? `&page=${page}` : ""
      }${pageLimit ? `&pageLimit=${pageLimit}` : ""}${
        status ? `&status=${status}` : ""
      }${sort ? `&sort=${sort}` : ""}${
        categories ? `&categories=${categories}` : ""
      }${selectedProgramId ? `&selectedProgramIds=${selectedProgramId}` : ""}`,
    FEED: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/feed`,
    STATS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/stats`,
    ADMINS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/admins`,
    INDICATORS: {
      COMMUNITY: {
        CREATE: (communityId: string) =>
          `/communities/${communityId}/impact-indicators`,
        DELETE: (communityId: string) =>
          `/communities/${communityId}/impact-indicators`,
        LIST: (communityId: string) =>
          `/communities/${communityId}/impact-indicators`,
      },
      CATEGORY: {
        LIST: (categoryId: string) =>
          `/category/${categoryId}/impact-indicators`,
      },
    },
  },
  GRANTS: {
    GET_ZK_GROUP: (
      chainID: string,
      communityUID: string,
      grantUID: string,
      scope: string
    ) =>
      `/semaphores/groups/check?chainID=${chainID}&communityUID=${communityUID}&grantUID=${grantUID}&scope=${scope}`,
    BY_UID: (grantUID: string) => `/grants/${grantUID}`,
    UPDATE_EXTERNAL_ID: `/grants/external-id/update`,
    REMOVE_EXTERNAL_ID: `/grants/external-id/delete`,
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
