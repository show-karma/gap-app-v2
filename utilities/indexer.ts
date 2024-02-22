export const INDEXER = {
  GENERAL: {
    QUESTIONS: `/questions`,
  },
  PROJECT: {
    FEED: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/feed`,
  },
  CATEGORIES: {
    QUESTIONS: {
      UPDATE: (idOrSlug: number) => `/categories/${idOrSlug}/questions`,
    },
  },
  COMMUNITY: {
    GET: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}`,
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
  },
  GRANTS: {
    BY_UID: (grantUID: string) => `/grants/${grantUID}`,
    REVIEWS: {
      REVIEWER: {
        GET_INFOS: (publicAddress: string) => `/reviewer/${publicAddress}`,
        SAVE: (publicAddress: string) => `/reviewer/${publicAddress}/infos`,
      },
      SEND: (grantUID: string) => `/grants/${grantUID}/questions/answer`,
      QUESTIONS: (grantUID: string) => `/grants/${grantUID}/questions`,
      USER_ANSWERED: (grantUID: string, publicAddress: string) =>
        `/grants/${grantUID}/questions/answer/${publicAddress}`,
      ALL: (grantUID: string) => `/grants/${grantUID}/questions/answer/feed`,
    },
    CATEGORIES: {
      ALL: `/categories`,
      UPDATE: (grantUID: string) => `/grants/${grantUID}/update/categories`,
    },
  },
  GAP: {
    STATS: `/attestations/stats`,
    WEEKLY_ACTIVE_USERS: `/attestations/wau`,
  },
};
