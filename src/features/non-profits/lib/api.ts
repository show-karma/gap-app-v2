/**
 * API route constants for the non-profits feature.
 *
 * All paths are relative to `NEXT_PUBLIC_GAP_INDEXER_URL` and are consumed by
 * `apiFetch` in `./api-fetch.ts`.
 *
 * Ported from grant-atlas `src/lib/api.ts` (API section only).
 * The PAGES constants live in `utilities/pages.ts` alongside existing routes.
 */
export const NON_PROFITS_API = {
  SEARCH_HISTORY: {
    LIST: "/v2/search-history",
    GET: (id: string) => `/v2/search-history/${id}`,
    CREATE: "/v2/search-history",
    APPEND_TURN: (id: string) => `/v2/search-history/${id}/turns`,
    DELETE: (id: string) => `/v2/search-history/${id}`,
    CLEAR: "/v2/search-history",
  },
  RESEARCH_TRAY: {
    LIST: "/v2/research-tray",
    CREATE: "/v2/research-tray",
    DELETE: (id: string) => `/v2/research-tray/${id}`,
    CLEAR: "/v2/research-tray",
  },
  PHILANTHROPY: {
    QUERY: "/v2/philanthropy/agent-query",
    QUERY_STREAM: "/v2/philanthropy/agent-query/stream",
    FEEDBACK: "/v2/agent/rating",
    FOUNDATIONS: {
      GET: (id: string) => `/v2/philanthropy/foundations/${id}`,
      GRANTS: (id: string) => `/v2/philanthropy/foundations/${id}/grants`,
      OFFICERS: (id: string) => `/v2/philanthropy/foundations/${id}/officers`,
      FINANCIALS: (id: string) => `/v2/philanthropy/foundations/${id}/financials`,
      FILING: (id: string, year: number) => `/v2/philanthropy/foundations/${id}/filings/${year}`,
    },
    NONPROFITS: {
      GET: (id: string) => `/v2/philanthropy/nonprofits/${id}`,
      GRANTS: (id: string) => `/v2/philanthropy/nonprofits/${id}/grants`,
    },
    GRANTS: {
      GET: (id: string) => `/v2/philanthropy/grants/${id}`,
    },
  },
} as const;
