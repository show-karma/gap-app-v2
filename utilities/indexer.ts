import { Hex } from "viem";

export const INDEXER = {
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
  PROJECT: {
    SUBSCRIBE: (projectId: Hex) => `/projects/${projectId}/subscribe`,
    GET: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}`,
    FEED: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/feed`,
    FUNDEDBY: (address: string) => `/projects/fundedby/${address}`,
    GRANTS_GENIE: (projectId: string) => `/projects/${projectId}/grants-genie`,
  },
  QUESTIONS: {
    CREATE: (idOrSlug: string) => `/questions/create/${idOrSlug}`,
  },
  CATEGORIES: {
    CREATE: (idOrSlug: string) => `/categories/create/${idOrSlug}`,
    QUESTIONS: {
      UPDATE: (idOrSlug: string) => `/categories/${idOrSlug}/questions`,
    },
  },
  COMMUNITY: {
    GET: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}`,
    SUBSCRIBE: {
      BULK: `/bulk-subscription/subscribe`,
    },
    REPORT: {
      GET: (communityIdOrSlug: string) =>
        `/communities/${communityIdOrSlug}/report`,
    },
    GRANTS: (
      communityIdOrSlug: string,
      {
        page,
        pageLimit,
        categories,
        sort,
        status,
      }: {
        page?: number;
        pageLimit?: number;
        categories?: string;
        sort?: string;
        status?: string;
      }
    ) =>
      `/communities/${communityIdOrSlug}/grants?${
        page || page === 0 ? `&page=${page}` : ""
      }${pageLimit ? `&pageLimit=${pageLimit}` : ""}${
        status ? `&status=${status}` : ""
      }${sort ? `&sort=${sort}` : ""}${
        categories ? `&categories=${categories}` : ""
      }`,
    FEED: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/feed`,
    CATEGORIES: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/categories`,
    QUESTIONS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/questions`,
    STATS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/stats`,
    ADMINS: (communityIdOrSlug: string) =>
      `/communities/${communityIdOrSlug}/admins`,
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
    REVIEWS: {
      REVIEWER: {
        GET_INFOS: (publicAddress: string) => `/reviewer/${publicAddress}`,
        SAVE: (publicAddress: string) => `/reviewer/${publicAddress}/infos`,
      },
      SEND: (grantUID: string) => `/grants/${grantUID}/questions/answer`,
      SEND_ANON: (grantUID: string) =>
        `/grants/${grantUID}/questions/answer-anon`,
      QUESTIONS: (grantUID: string) => `/grants/${grantUID}/questions`,
      USER_ANSWERED: (grantUID: string, publicAddress: string) =>
        `/grants/${grantUID}/questions/answer/${publicAddress}`,
      ALL: (grantUID: string) => `/grants/${grantUID}/questions/answer/feed`,
      ALL_ANON: (grantUID: string) =>
        `/grants/${grantUID}/questions/answer/feed-anon`,
    },
    CATEGORIES: {
      ALL: (idOrSlug: string) => `/communities/${idOrSlug}/categories`,
      UPDATE: (grantUID: string) => `/grants/${grantUID}/update/categories`,
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
