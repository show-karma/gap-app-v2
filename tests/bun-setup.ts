/**
 * Bun Test Setup File
 *
 * This file is preloaded before running tests with Bun's test runner.
 * It sets up the DOM environment, testing library matchers, and global mocks.
 *
 * Equivalent to Jest's setupFilesAfterEnv configuration.
 *
 * IMPORTANT: Jest compatibility is provided via a separate preload file
 * (tests/jest-compat.ts) that must run FIRST to handle module-level jest.mock() calls.
 */

import { afterAll, afterEach, beforeAll, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import "@testing-library/jest-dom";

// Import mock utilities from jest-compat
import { createMockFn, preRegisteredMocks, registerMock } from "./jest-compat";

// =============================================================================
// DOM Environment Setup
// =============================================================================

// Register happy-dom globally for DOM testing
// This provides window, document, and other DOM APIs
GlobalRegistrator.register();

// =============================================================================
// Polyfills for Node/Bun environment
// =============================================================================

// TextEncoder/TextDecoder polyfills
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = await import("node:util");
  global.TextEncoder = TextEncoder;
  // @ts-expect-error - TextDecoder types
  global.TextDecoder = TextDecoder;
}

// =============================================================================
// Browser API Mocks
// =============================================================================

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  disconnect() {}
  observe(_target: Element) {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve(_target: Element) {}
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  disconnect() {}
  observe(_target: Element) {}
  unobserve(_target: Element) {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number;
};
global.cancelAnimationFrame = (handle: number): void => {
  clearTimeout(handle);
};

// Mock scrollTo
window.scrollTo = () => {};

// =============================================================================
// Environment Variables for Tests
// =============================================================================

process.env.TZ = "UTC";
process.env.NEXT_PUBLIC_GAP_INDEXER_URL = "https://gap-indexer.vercel.app";
process.env.NEXT_PUBLIC_PRIVY_APP_ID = "test-privy-app-id";
process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID = "test-alchemy-policy-id";
process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID = "test-zerodev-project-id";

// =============================================================================
// Pre-Registered Mock Functions
// =============================================================================
// These mocks are registered BEFORE tests run, solving the Jest hoisting issue.
// Tests can access these via jest.getMock("@/utilities/fetchData") or
// by importing the module (which returns the mock).
//
// IMPORTANT: Only pre-register SIMPLE mocks that don't need per-test customization.
// Complex mocks (like api-client) should be left to tests to configure via jest.mock().

// Create mock functions for commonly mocked modules
const mockFetchData = createMockFn();
const mockTokenManagerGetToken = createMockFn();
const mockErrorManager = createMockFn();

// Register mocks globally so tests can configure them
registerMock("@/utilities/fetchData", mockFetchData);
registerMock("@/utilities/auth/token-manager", mockTokenManagerGetToken);
registerMock("@/components/Utilities/errorManager", mockErrorManager);

// Pre-register module mocks using mock.module()
// These MUST be registered before ANY test file imports them

// Mock @/utilities/fetchData - default export is the mock function
mock.module("@/utilities/fetchData", () => ({
  default: mockFetchData,
  __esModule: true,
}));

// Mock @/components/Utilities/errorManager - named export
mock.module("@/components/Utilities/errorManager", () => ({
  errorManager: mockErrorManager,
  __esModule: true,
}));

// Mock @/utilities/auth/token-manager
mock.module("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: mockTokenManagerGetToken,
    setToken: createMockFn(),
    clearToken: createMockFn(),
  },
  __esModule: true,
}));

// Mock mixpanel-browser (commonly used in hooks)
const mockMixpanelInit = createMockFn();
const mockMixpanelTrack = createMockFn();
const mockMixpanelPeople = {
  set: createMockFn(),
};
const mockMixpanel = Object.assign(createMockFn(), {
  init: mockMixpanelInit,
  track: mockMixpanelTrack,
  people: mockMixpanelPeople,
  reset: createMockFn(),
  identify: createMockFn(),
  register: createMockFn(),
  register_once: createMockFn(),
});

mock.module("mixpanel-browser", () => ({
  default: mockMixpanel,
  __esModule: true,
}));

registerMock("mixpanel-browser", mockMixpanel as any);

// Mock axios - use createMockFn so tests can configure behavior
const mockAxiosRequest = createMockFn();
const mockAxiosGet = createMockFn();
const mockAxiosPost = createMockFn();
const mockAxiosPut = createMockFn();
const mockAxiosDelete = createMockFn();
const mockAxiosPatch = createMockFn();
const mockAxios = Object.assign(createMockFn(), {
  request: mockAxiosRequest,
  get: mockAxiosGet,
  post: mockAxiosPost,
  put: mockAxiosPut,
  delete: mockAxiosDelete,
  patch: mockAxiosPatch,
  create: createMockFn(() => ({
    request: mockAxiosRequest,
    get: mockAxiosGet,
    post: mockAxiosPost,
    put: mockAxiosPut,
    delete: mockAxiosDelete,
    patch: mockAxiosPatch,
  })),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: createMockFn(), eject: createMockFn() },
    response: { use: createMockFn(), eject: createMockFn() },
  },
  isAxiosError: createMockFn(() => false),
});
mock.module("axios", () => ({
  default: mockAxios,
  __esModule: true,
}));
registerMock("axios", mockAxios);

// Export mock references for tests that need direct access
(globalThis as any).__mocks__ = {
  fetchData: mockFetchData,
  errorManager: mockErrorManager,
  TokenManager: {
    getToken: mockTokenManagerGetToken,
  },
  mixpanel: mockMixpanel,
  axios: mockAxios,
};

// =============================================================================
// Module Mocks
// =============================================================================

// Mock INDEXER utility - this is used extensively in services
// Mock both the aliased and relative paths
const indexerMock = {
  INDEXER: {
    ATTESTATION_LISTENER: (hash: string, chainId: number) =>
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
        GET_ALL: () => "/v2/program-registry",
        GET_PENDING: () => "/v2/program-registry/pending",
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
        BY_COMMUNITY: (communityId: string) =>
          `/v2/funding-program-configs/community/${communityId}`,
        GET: (programId: string) => `/v2/funding-program-configs/${programId}`,
        LIST: (community?: string) =>
          `/v2/funding-program-configs${community ? `?community=${community}` : ""}`,
        ENABLED: () => `/v2/funding-program-configs/enabled`,
        REVIEWERS: (programId: string) => `/v2/funding-program-configs/${programId}/reviewers`,
        CHECK_PERMISSION: (programId: string, action?: string) =>
          `/v2/funding-program-configs/${programId}/check-permission`,
        MY_REVIEWER_PROGRAMS: () => `/v2/funding-program-configs/my-reviewer-programs`,
      },
      FUNDING_APPLICATIONS: {
        GET: (applicationId: string) => `/v2/funding-applications/${applicationId}`,
        BY_PROGRAM: (programId: string) => `/v2/funding-applications/program/${programId}`,
        BY_EMAIL: (programId: string, email: string) =>
          `/v2/funding-applications/program/${programId}/by-email?email=${encodeURIComponent(email)}`,
        STATISTICS: (programId: string) =>
          `/v2/funding-applications/program/${programId}/statistics`,
        EXPORT: (programId: string) => `/v2/funding-applications/program/${programId}/export`,
        ADMIN_EXPORT: (programId: string) => `/v2/funding-applications/admin/${programId}/export`,
        VERSIONS_TIMELINE: (referenceNumber: string) =>
          `/v2/funding-applications/${referenceNumber}/versions/timeline`,
        REVIEWERS: (applicationId: string) => `/v2/funding-applications/${applicationId}/reviewers`,
      },
      USER: {
        PERMISSIONS: (resource?: string) => `/v2/user/permissions`,
        ADMIN_COMMUNITIES: () => `/v2/user/communities/admin`,
        PROJECTS: (page?: number, limit?: number) => `/v2/user/projects`,
      },
      MILESTONE_REVIEWERS: {
        LIST: (programId: string) => `/v2/programs/${programId}/milestone-reviewers`,
      },
      REGISTRY: {
        GET_ALL: "/v2/program-registry/search",
        GET_BY_ID: (programId: string) => `/v2/program-registry/${programId}`,
        GET_FILTERS: "/v2/program-registry/filters",
      },
      TRACKS: {
        LIST: (communityUID: string, includeArchived?: boolean) =>
          `/v2/tracks?communityUID=${communityUID}`,
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
        DEPLOYER: (network: string, contractAddress: string) => `/v2/projects/contracts/deployer`,
        VERIFY_MESSAGE: () => `/v2/projects/contracts/verify-message`,
        VERIFY_SIGNATURE: () => `/v2/projects/contracts/verify-signature`,
      },
      SUBSCRIBE: (projectId: string) => `/projects/${projectId}/subscribe`,
      FEED: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/feed`,
      FUNDEDBY: (address: string) => `/projects/fundedby/${address}`,
      GRANTS_GENIE: (projectId: string) => `/projects/${projectId}/grants-genie`,
      REQUEST_INTRO: (projectIdOrSlug: string) => `/projects/requestintro/${projectIdOrSlug}`,
      ENDORSEMENT: {
        NOTIFY: (projectIdOrSlug: string) => `/projects/${projectIdOrSlug}/endorsements/notify`,
      },
      ALL_REPORT: (offset: number, limit: number) =>
        `/projects/report?offset=${offset}&limit=${limit}`,
      REVOKE_ATTESTATION: (attestationUID: string, chainId: number) =>
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
        `/projects/${projectUID}/indicator-dashboard-metrics`,
      V2: {
        LIST: () => `/v2/indicators`,
        GET_BY_ID: (indicatorId: string) => `/v2/indicators/${indicatorId}`,
        DATAPOINTS: (indicatorId: string) => `/v2/indicators/${indicatorId}/datapoints`,
        PROJECT_INDICATORS: (projectUID: string) => `/v2/indicators/projects/${projectUID}`,
        COMMUNITY_AGGREGATE: (communityUID: string) =>
          `/v2/indicators/communities/${communityUID}/aggregate`,
      },
    },
    COMMUNITY: {
      LIST: () => `/v2/communities/`,
      CATEGORIES: (idOrSlug: string) => `/communities/${idOrSlug}/categories`,
      REGIONS: (idOrSlug: string) => `/v2/communities/${idOrSlug}/regions`,
      V2: {
        GET: (slug: string) => `/v2/communities/${slug}`,
        GRANTS: (slug: string) => `/v2/communities/${slug}/grants`,
        STATS: (slug: string) => `/v2/communities/${slug}/stats`,
        IMPACT_SEGMENTS: (communityUID: string) => `/v2/impact-segments/${communityUID}`,
        INDICATORS: {
          AGGREGATED: () => `/v2/indicators/aggregate`,
        },
        COMMUNITY_METRICS: (
          communityIdOrSlug: string,
          params?: { startDate?: string; endDate?: string; metricNames?: string }
        ) => {
          const urlParams = new URLSearchParams();
          if (params?.startDate) urlParams.append("startDate", params.startDate);
          if (params?.endDate) urlParams.append("endDate", params.endDate);
          if (params?.metricNames) urlParams.append("metricNames", params.metricNames);
          const queryString = urlParams.toString();
          return `/v2/communities/${communityIdOrSlug}/community-metrics${queryString ? `?${queryString}` : ""}`;
        },
        PROJECTS: (slug: string) => `/v2/communities/${slug}/projects`,
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
      GRANTS: (communityIdOrSlug: string) => `/communities/${communityIdOrSlug}/grants`,
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
  },
};

// Mock @/utilities/enviromentVars with full env vars for gasless tests
mock.module("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL:
      process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "https://gap-indexer.vercel.app",
    ZERODEV_PROJECT_ID: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "test-zerodev-project-id",
    ALCHEMY_POLICY_ID: process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || "test-alchemy-policy-id",
    RPC: {
      OPTIMISM: "https://rpc.optimism.test",
      ARBITRUM: "https://rpc.arbitrum.test",
      BASE: "https://rpc.base.test",
      MAINNET: "https://rpc.mainnet.test",
      POLYGON: "https://rpc.polygon.test",
      CELO: "https://rpc.celo.test",
      SCROLL: "https://rpc.scroll.test",
      SEI: "https://rpc.sei.test",
      LISK: "https://rpc.lisk.test",
      OPT_SEPOLIA: "https://rpc.opt-sepolia.test",
      BASE_SEPOLIA: "https://rpc.base-sepolia.test",
      SEPOLIA: "https://rpc.sepolia.test",
    },
  },
}));

// Note: @/utilities/sanitize is NOT mocked - tests use the real implementation
// since it's a pure utility function with no external dependencies.

// Mock @/utilities/retries
const mockRetryUntilConditionMet = createMockFn();
mock.module("@/utilities/retries", () => ({
  retryUntilConditionMet: mockRetryUntilConditionMet,
}));
registerMock("@/utilities/retries", {
  retryUntilConditionMet: mockRetryUntilConditionMet,
});

// Mock @/services/project-grants.service
const mockGetProjectGrants = createMockFn();
mock.module("@/services/project-grants.service", () => ({
  getProjectGrants: mockGetProjectGrants,
}));
registerMock("@/services/project-grants.service", {
  getProjectGrants: mockGetProjectGrants,
});

// Register mock for both aliased and relative paths
mock.module("@/utilities/indexer", () => indexerMock);
mock.module("./utilities/indexer", () => indexerMock);
mock.module("utilities/indexer", () => indexerMock);
mock.module("/home/amaury/gap/gap-app-v2/utilities/indexer", () => indexerMock);

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: () => {},
  redirect: () => {},
}));

// Mock next/image
mock.module("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return { type: "img", props: { src, alt: alt || "", ...rest } };
  },
}));

// Mock next/link
mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: unknown;
    href: string;
    [key: string]: unknown;
  }) => ({
    type: "a",
    props: { href, ...props, children },
  }),
}));

// Mock @/components/Utilities/PrivyProviderWrapper with queryClient
const mockInvalidateQueries = createMockFn();
const mockQueryClient = {
  invalidateQueries: mockInvalidateQueries,
  prefetchQuery: createMockFn(),
  getQueryData: createMockFn(),
  setQueryData: createMockFn(),
};
mock.module("@/components/Utilities/PrivyProviderWrapper", () => ({
  queryClient: mockQueryClient,
}));
registerMock("@/components/Utilities/PrivyProviderWrapper", {
  queryClient: mockQueryClient,
});

// Export for test access
(globalThis as any).__mocks__.queryClient = mockQueryClient;

// Mock @/utilities/queryKeys
const mockQueryKeys = {
  AUTH: {
    STAFF_AUTHORIZATION: (address?: string) =>
      ["staffAuthorization", address?.toLowerCase()] as const,
    STAFF_AUTHORIZATION_BASE: ["staffAuthorization"] as const,
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
};
mock.module("@/utilities/queryKeys", () => ({
  QUERY_KEYS: mockQueryKeys,
}));
registerMock("@/utilities/queryKeys", { QUERY_KEYS: mockQueryKeys });

// Mock @privy-io/react-auth
mock.module("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: false,
    login: () => {},
    logout: () => {},
    user: null,
    getAccessToken: async () => "mock-token",
  }),
  useWallets: () => ({
    wallets: [],
    ready: true,
  }),
  useLogin: () => ({
    login: () => {},
  }),
  useLogout: () => ({
    logout: () => {},
  }),
  PrivyProvider: ({ children }: { children: unknown }) => children,
}));

// Mock wagmi
mock.module("wagmi", () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    connector: null,
  }),
  useChainId: () => 1,
  useBalance: () => ({
    data: undefined,
    isLoading: false,
  }),
  useConnect: () => ({
    connect: () => {},
    connectors: [],
  }),
  useDisconnect: () => ({
    disconnect: () => {},
  }),
  useSwitchChain: () => ({
    switchChain: () => {},
    chains: [],
  }),
  useWalletClient: () => ({
    data: null,
  }),
  usePublicClient: () => ({
    data: null,
  }),
  WagmiProvider: ({ children }: { children: unknown }) => children,
  createConfig: () => ({}),
}));

// Mock @wagmi/core with createConnector
mock.module("@wagmi/core", () => ({
  getAccount: () => ({}),
  getBalance: () => ({}),
  switchChain: () => {},
  readContract: () => {},
  writeContract: () => {},
  createConfig: () => ({}),
  createStorage: () => ({}),
  cookieStorage: {},
  http: (url: string) => ({
    url,
    type: "http",
  }),
  getConnections: () => [],
  disconnect: () => {},
  watchAccount: () => {},
  reconnect: () => {},
  createConnector: (fn: () => unknown) => fn,
}));

// Mock @wagmi/core/chains
mock.module("@wagmi/core/chains", () => ({
  optimism: { id: 10, name: "Optimism" },
  arbitrum: { id: 42161, name: "Arbitrum" },
  baseSepolia: { id: 84532, name: "Base Sepolia" },
  base: { id: 8453, name: "Base" },
  optimismSepolia: { id: 11155420, name: "Optimism Sepolia" },
  celo: { id: 42220, name: "Celo" },
  sei: { id: 1329, name: "Sei" },
  sepolia: { id: 11155111, name: "Sepolia" },
  lisk: { id: 1135, name: "Lisk" },
  scroll: { id: 534352, name: "Scroll" },
}));

// Note: ZeroDev SDK, Alchemy SDK, viem, and ethers are NOT mocked globally.
// The gasless utility tests are complex integration tests that involve
// multiple third-party SDKs with complex dependencies. These tests require
// the real modules to properly test the integration logic.
//
// For gasless provider tests specifically:
// - Tests that need SDK mocks should define them locally in the test file
// - OR skip SDK-dependent tests with appropriate comments
// - The real viem module is used for utility functions (http, concatHex, etc.)

// Mock @sentry/nextjs - use createMockFn so tests can verify calls
const mockSentryCaptureException = createMockFn();
const mockSentryCaptureMessage = createMockFn();
const mockSentryWithScope = createMockFn((callback: (scope: { setExtras: () => void }) => void) =>
  callback({ setExtras: () => {} })
);
mock.module("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
  captureMessage: mockSentryCaptureMessage,
  withScope: mockSentryWithScope,
}));
registerMock("@sentry/nextjs", {
  captureException: mockSentryCaptureException,
  captureMessage: mockSentryCaptureMessage,
  withScope: mockSentryWithScope,
});

// Mock rehype plugins (ESM-only packages)
mock.module("rehype-sanitize", () => ({
  default: () => (tree: unknown) => tree,
}));

mock.module("rehype-external-links", () => ({
  default: () => (tree: unknown) => tree,
}));

mock.module("remark-gfm", () => ({
  default: () => (tree: unknown) => tree,
}));

mock.module("remark-breaks", () => ({
  default: () => (tree: unknown) => tree,
}));

// Mock until-async (ESM-only package that Jest couldn't transform)
mock.module("until-async", () => ({
  default: async <T>(promise: Promise<T>) => {
    try {
      const result = await promise;
      return [null, result];
    } catch (error) {
      return [error, null];
    }
  },
}));

// Mock multiformats/cid
mock.module("multiformats/cid", () => ({
  CID: {
    parse: (str: string) => ({ toString: () => str }),
    decode: (bytes: Uint8Array) => ({ toString: () => "mock-cid" }),
  },
}));

// Mock privy-config
mock.module("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: () => ({}),
}));

// =============================================================================
// MSW Setup
// =============================================================================

// Import MSW setup - it will configure the mock server
// Note: MSW handlers are in __tests__/utils/msw/handlers.ts
let mswServer: ReturnType<typeof import("msw/node").setupServer> | null = null;

beforeAll(async () => {
  try {
    const { setupServer } = await import("msw/node");
    const { handlers } = await import("../__tests__/utils/msw/handlers");
    mswServer = setupServer(...handlers);
    mswServer.listen({ onUnhandledRequest: "warn" });
  } catch (error) {
    console.warn("MSW setup failed, tests will run without API mocking:", error);
  }
});

afterEach(() => {
  mswServer?.resetHandlers();
  // Clear all mocks after each test
  if ((globalThis as any).jest?.clearAllMocks) {
    (globalThis as any).jest.clearAllMocks();
  }
});

afterAll(() => {
  mswServer?.close();
  GlobalRegistrator.unregister();
});

// =============================================================================
// Utility Exports for Tests
// =============================================================================

/**
 * Viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 1024, height: 768 },
  DESKTOP: { width: 1440, height: 900 },
  WIDE: { width: 1920, height: 1080 },
};

/**
 * Set viewport size for responsive testing
 */
export const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event("resize"));
};
