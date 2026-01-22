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

// =============================================================================
// DOM Environment Setup - MUST BE FIRST
// =============================================================================

// Register happy-dom globally for DOM testing
// This provides window, document, and other DOM APIs
// IMPORTANT: This must happen BEFORE importing @testing-library/react
// because Testing Library's `screen` checks for document.body at import time
GlobalRegistrator.register();

// Now we can safely import testing-library modules using dynamic import
// This ensures the imports happen after GlobalRegistrator.register()
const { cleanup: rtlCleanup } = await import("@testing-library/react");
await import("@testing-library/jest-dom");

// Import mock utilities from jest-compat
import { createMockFn, preRegisteredMocks, registerMock } from "./jest-compat";

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

// Mock localStorage - required for zustand persist middleware
// This needs to be set up before any zustand stores are imported
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// Export localStorage mock for test access
(globalThis as any).__mockLocalStorage__ = mockLocalStorage;

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

// Mock lucide-react - Bun has ESM/CJS interop issues with this package
// Create a factory that returns mock SVG components for any icon
const createMockIcon = (name: string) => {
  const MockIcon = (props: any) =>
    React.createElement("svg", { "data-testid": `${name}-icon`, ...props });
  MockIcon.displayName = name;
  return MockIcon;
};

// Create a Proxy-based module that generates mock icons on demand
// This handles any lucide-react icon import without needing to list them all
const lucideReactIconCache: Record<string, ReturnType<typeof createMockIcon>> = {};

const getLucideIcon = (name: string) => {
  if (!lucideReactIconCache[name]) {
    lucideReactIconCache[name] = createMockIcon(name);
  }
  return lucideReactIconCache[name];
};

// Pre-create all commonly used icons in the codebase
// This ensures they're available for both named and default exports
const lucideIcons = [
  // Core/utility icons
  "Loader2",
  "Loader2Icon",
  "Check",
  "CheckIcon",
  "X",
  "XIcon",
  "Search",
  "SearchIcon",
  "Plus",
  "PlusIcon",
  "Minus",
  "MinusIcon",
  "Info",
  "InfoIcon",
  // Navigation/chevron icons
  "ChevronDown",
  "ChevronDownIcon",
  "ChevronUp",
  "ChevronUpIcon",
  "ChevronLeft",
  "ChevronRight",
  // Alert/notification icons
  "AlertCircle",
  "AlertCircleIcon",
  "Bell",
  "BellDot",
  // Circle-based icons
  "Circle",
  "CircleHelp",
  "CircleUser",
  "CheckCircle2",
  "MinusCircle",
  "PlusCircle",
  "CheckSquare2Icon",
  // Arrow icons
  "ArrowUpRight",
  "ArrowDownToDot",
  // User/account icons
  "LogOutIcon",
  "Settings",
  "ShieldCheck",
  "FolderKanban",
  "Heart",
  "CopyPlus",
  "UserPlus",
  // Toggle icons
  "ToggleLeft",
  "ToggleRight",
  // Data/chart icons
  "BarChart2",
  "Calendar",
  "Clock",
  "Coins",
  // Content icons
  "FolderOpen",
  "Code",
  "Mail",
  "MessageCircleMore",
  "SquareCheckBig",
  "MoreHorizontal",
  // Action icons
  "FastForward",
  "IterationCw",
  "Trophy",
  "Vote",
  "Zap",
  // Navbar menu-items.tsx icons
  "BanknoteArrowDown",
  "Flame",
  "GalleryThumbnails",
  "GoalIcon",
  "LayoutGrid",
  "LayoutList",
  "LifeBuoy",
  "PhoneCall",
  "Radio",
  "ScrollText",
  // funding-program-details-dialog.tsx icons
  "BadgeCheck",
  "Bug",
  "Building2",
  "ExternalLink",
  "Globe",
  // components folder icons (MarkdownEditor, Donation, etc.)
  "AlertTriangle",
  "ArrowLeft",
  "ArrowRight",
  "ChartLine",
  "CreditCard",
  "DollarSign",
  "Eye",
  "EyeOff",
  "LandPlot",
  "SquareUser",
  // Additional common icons that may be used
  "Copy",
  "Play",
  "Pause",
  "Trash",
  "Trash2",
  "Edit",
  "Edit2",
  "Pencil",
  "Save",
  "Download",
  "Upload",
  "File",
  "FileText",
  "Filter",
  "Home",
  "Link",
  "Link2",
  "Lock",
  "Unlock",
  "Map",
  "MapPin",
  "Menu",
  "MoreVertical",
  "RefreshCw",
  "RotateCw",
  "Share",
  "Share2",
  "Star",
  "Sun",
  "Moon",
  "User",
  "Users",
  "Wallet",
  "XCircle",
  "HelpCircle",
  "Image",
  "List",
  "Grid",
  "Package",
  "Power",
  "Send",
  "Bookmark",
  "Flag",
  "Hash",
  "Key",
  "Layout",
  "LogIn",
  "Maximize",
  "Minimize",
  "MessageSquare",
  "Monitor",
  "Newspaper",
  "Paperclip",
  "Percent",
  "Pin",
  "Shield",
  "Square",
  "Tag",
  "Terminal",
  "ThumbsUp",
  "ThumbsDown",
  "Video",
  "Wifi",
  "Activity",
  "Airplay",
  "Anchor",
  "Archive",
  "Award",
  "Box",
  "Briefcase",
  "Camera",
  "Cast",
  "Clipboard",
  "Cloud",
  "Compass",
  "Database",
  "Disc",
  "Droplet",
  "Feather",
  "Film",
  "Folder",
  "Gift",
  "GitBranch",
  "Github",
  "Gitlab",
  "Headphones",
  "Inbox",
  "Layers",
  "Linkedin",
  "Mic",
  "Music",
  "Navigation",
  "Phone",
  "Printer",
  "Repeat",
  "Server",
  "Shuffle",
  "Sidebar",
  "Slack",
  "Speaker",
  "Target",
  "Tool",
  "Truck",
  "Tv",
  "Twitter",
  "Umbrella",
  "Volume",
  "Volume2",
  "Watch",
  "Wind",
  // Additional icons found in CI
  "FlaskConical",
].reduce(
  (acc, name) => {
    acc[name] = getLucideIcon(name);
    return acc;
  },
  {} as Record<string, ReturnType<typeof createMockIcon>>
);

mock.module("lucide-react", () => ({
  __esModule: true,
  // Spread all pre-created icons
  ...lucideIcons,
  // LucideIcon type export (used as type annotation)
  LucideIcon: {} as any,
  // Default export with proxy for any dynamic access
  default: new Proxy(
    {},
    {
      get(_target: any, prop: string) {
        return getLucideIcon(prop);
      },
    }
  ),
}));

// Also mock @/components/ui/spinner directly to avoid lucide-react import issues
mock.module("@/components/ui/spinner", () => ({
  Spinner: (props: any) =>
    React.createElement("svg", { role: "status", "aria-label": "Loading", ...props }),
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
const mockAxiosInterceptors = {
  request: { use: createMockFn(), eject: createMockFn() },
  response: { use: createMockFn(), eject: createMockFn() },
};
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
    interceptors: mockAxiosInterceptors,
    defaults: { headers: { common: {} } },
  })),
  defaults: { headers: { common: {} } },
  interceptors: mockAxiosInterceptors,
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
  // Note: toast is added after definition below
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
        PERMISSIONS: (resource?: string) => {
          const params = new URLSearchParams();
          if (resource) params.append("resource", resource);
          const queryString = params.toString();
          return `/v2/user/permissions${queryString ? `?${queryString}` : ""}`;
        },
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
const mockRetry = createMockFn((fn: () => unknown) => fn());
mock.module("@/utilities/retries", () => ({
  retryUntilConditionMet: mockRetryUntilConditionMet,
  retry: mockRetry,
}));
registerMock("@/utilities/retries", {
  retryUntilConditionMet: mockRetryUntilConditionMet,
  retry: mockRetry,
});

// NOTE: Do NOT mock @/services/project-grants.service here
// because it prevents unit tests from testing the real implementation.
// Integration tests that need to mock this service can do so locally.
// const mockGetProjectGrants = createMockFn();
// mock.module("@/services/project-grants.service", () => ({
//   getProjectGrants: mockGetProjectGrants,
// }));
// registerMock("@/services/project-grants.service", {
//   getProjectGrants: mockGetProjectGrants,
// });

// Register mock for both aliased and relative paths
mock.module("@/utilities/indexer", () => indexerMock);
mock.module("./utilities/indexer", () => indexerMock);
mock.module("utilities/indexer", () => indexerMock);
mock.module("/home/amaury/gap/gap-app-v2/utilities/indexer", () => indexerMock);
mock.module(
  "/home/amaury/gap/.worktrees/feat-migration-to-bun/gap-app-v2/utilities/indexer",
  () => indexerMock
);

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

// Mock next/dynamic - return a component that renders the loading state
mock.module("next/dynamic", () => {
  const React = require("react");
  return {
    default: (
      importFn: () => Promise<{ default: React.ComponentType }>,
      options?: { loading?: () => React.ReactNode; ssr?: boolean }
    ) => {
      // Return a component that renders the loading state (for testing)
      const DynamicComponent = (props: Record<string, unknown>) => {
        if (options?.loading) {
          return options.loading();
        }
        return React.createElement("div", { "data-testid": "dynamic-loading" }, "Loading...");
      };
      DynamicComponent.displayName = "DynamicComponent";
      return DynamicComponent;
    },
  };
});

// Mock next/image - return actual React element
mock.module("next/image", () => {
  const React = require("react");
  return {
    default: (props: Record<string, unknown>) => {
      const { src, alt, width, height, ...rest } = props;
      return React.createElement("img", {
        src: typeof src === "object" ? (src as { src: string }).src : src,
        alt: alt || "",
        width,
        height,
        ...rest,
      });
    },
  };
});

// Mock next/link - return actual React element
mock.module("next/link", () => {
  const React = require("react");
  return {
    default: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
    useLinkStatus: () => ({
      pending: false,
    }),
  };
});

// Mock @/components/Utilities/PrivyProviderWrapper with queryClient and default export
const mockInvalidateQueries = createMockFn();
const mockQueryClient = {
  invalidateQueries: mockInvalidateQueries,
  prefetchQuery: createMockFn(),
  getQueryData: createMockFn(),
  setQueryData: createMockFn(),
};
// Default export is a component that wraps children with testid
mock.module("@/components/Utilities/PrivyProviderWrapper", () => {
  const React = require("react");
  return {
    default: ({ children }: { children: unknown }) =>
      React.createElement("div", { "data-testid": "privy-provider" }, children),
    queryClient: mockQueryClient,
  };
});
registerMock("@/components/Utilities/PrivyProviderWrapper", {
  queryClient: mockQueryClient,
});

// Export for test access
(globalThis as any).__mocks__.queryClient = mockQueryClient;

// Mock @/utilities/queryKeys - include all keys used by hooks
const mockQueryKeys = {
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
  CONTRACTS: {
    DEPLOYER: (network: string, contractAddress: string) =>
      ["contract-deployer", network, contractAddress] as const,
    VALIDATION: {
      ALL: ["contract-validation"] as const,
      VALIDATE: (params: { address: string; network: string; excludeProjectId?: string }) =>
        ["contract-validation", params] as const,
    },
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
  SEARCH: {
    PROJECTS: (query: string) => ["search-projects", query] as const,
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
  SETTINGS: {
    AVAILABLE_AI_MODELS: ["available-ai-models"] as const,
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

// Mock wagmi - configurable state for integration tests
const wagmiMockState = {
  account: {
    address: undefined as string | undefined,
    isConnected: false,
    connector: null,
  },
  chainId: 1,
  walletClient: null as any,
  publicClient: null as any,
  writeContract: {
    writeContract: createMockFn(),
    writeContractAsync: createMockFn(),
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: createMockFn(),
  },
  switchChain: createMockFn(),
  // Configurable state for useWaitForTransactionReceipt hook
  waitForTransactionReceipt: {
    data: null as { status: string; transactionHash: string } | null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  },
};

// Export wagmi mock state for test configuration
(globalThis as any).__wagmiMockState__ = wagmiMockState;

mock.module("wagmi", () => ({
  useAccount: () => wagmiMockState.account,
  useChainId: () => wagmiMockState.chainId,
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
    switchChain: wagmiMockState.switchChain,
    chains: [],
  }),
  useWalletClient: () => ({
    data: wagmiMockState.walletClient,
    refetch: createMockFn(() => Promise.resolve({ data: wagmiMockState.walletClient })),
  }),
  usePublicClient: () => wagmiMockState.publicClient,
  useWaitForTransactionReceipt: (params?: { hash?: string; query?: { enabled?: boolean } }) => {
    // Return idle state when hash is empty or query is disabled
    if (!params?.hash || params?.query?.enabled === false) {
      return {
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      };
    }
    return wagmiMockState.waitForTransactionReceipt;
  },
  useWriteContract: () => wagmiMockState.writeContract,
  useReadContract: () => ({
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    refetch: createMockFn(),
  }),
  useSimulateContract: () => ({
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  useSignMessage: () => ({
    signMessage: createMockFn(),
    signMessageAsync: createMockFn(() => Promise.resolve("0xmocksignature")),
    data: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: createMockFn(),
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
  getWalletClient: createMockFn(() => Promise.resolve(null)),
  getPublicClient: createMockFn(() => ({})),
  waitForTransactionReceipt: createMockFn(() => Promise.resolve({ status: "success" })),
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

// Mock react-hot-toast
const mockToastSuccess = createMockFn();
const mockToastError = createMockFn();
const mockToastLoading = createMockFn();
const mockToastDismiss = createMockFn();
const mockToastPromise = createMockFn();
const mockToast = Object.assign(createMockFn(), {
  success: mockToastSuccess,
  error: mockToastError,
  loading: mockToastLoading,
  dismiss: mockToastDismiss,
  promise: mockToastPromise,
  custom: createMockFn(),
  remove: createMockFn(),
});
mock.module("react-hot-toast", () => {
  const React = require("react");
  return {
    default: mockToast,
    toast: mockToast,
    Toaster: () => React.createElement("div", { "data-testid": "toaster" }),
  };
});
registerMock("react-hot-toast", mockToast);
// Add toast to global mocks for test access
(globalThis as any).__mocks__.toast = mockToast;

// Mock @/utilities/donations/errorMessages
const mockGetDetailedErrorInfo = createMockFn(() => ({
  code: "UNKNOWN_ERROR",
  message: "An unexpected error occurred",
  technicalMessage: "Test error",
  actionableSteps: ["Try again", "Contact support"],
}));
const mockParseDonationError = createMockFn(() => ({
  code: "UNKNOWN_ERROR",
  message: "An unexpected error occurred",
  actionableSteps: [],
}));

// =============================================================================
// Donation Flow Mocks
// =============================================================================

// Mock @/utilities/donations/batchDonations
mock.module("@/utilities/donations/batchDonations", () => ({
  BatchDonationsABI: [],
  BATCH_DONATIONS_CONTRACTS: {
    10: "0x1111111111111111111111111111111111111111",
    8453: "0x2222222222222222222222222222222222222222",
    42161: "0x3333333333333333333333333333333333333333",
  },
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  getBatchDonationsContractAddress: createMockFn((chainId: number) => {
    const contracts: Record<number, string> = {
      10: "0x1111111111111111111111111111111111111111",
      8453: "0x2222222222222222222222222222222222222222",
      42161: "0x3333333333333333333333333333333333333333",
    };
    return contracts[chainId];
  }),
  getSupportedBatchDonationsChains: createMockFn(() => [10, 8453, 42161]),
}));

// Mock @/utilities/erc20
const mockCheckTokenAllowances = createMockFn(() => Promise.resolve([]));
const mockExecuteApprovals = createMockFn(() => Promise.resolve([]));
const mockGetApprovalAmount = createMockFn((amount: bigint) => amount);
const mockApproveToken = createMockFn(() => Promise.resolve("0xmockhash"));
mock.module("@/utilities/erc20", () => ({
  checkTokenAllowances: mockCheckTokenAllowances,
  executeApprovals: mockExecuteApprovals,
  getApprovalAmount: mockGetApprovalAmount,
  approveToken: mockApproveToken,
}));
(globalThis as any).__mocks__.checkTokenAllowances = mockCheckTokenAllowances;
(globalThis as any).__mocks__.executeApprovals = mockExecuteApprovals;
(globalThis as any).__mocks__.getApprovalAmount = mockGetApprovalAmount;

// Mock @/utilities/rpcClient
const mockGetRPCClient = createMockFn(() => Promise.resolve(null));
const mockGetRPCUrlByChainId = createMockFn((chainId: number) => `https://rpc.test/${chainId}`);
mock.module("@/utilities/rpcClient", () => ({
  getRPCClient: mockGetRPCClient,
  getRPCUrlByChainId: mockGetRPCUrlByChainId,
}));
(globalThis as any).__mocks__.getRPCClient = mockGetRPCClient;
(globalThis as any).__mocks__.getRPCUrlByChainId = mockGetRPCUrlByChainId;

// Mock @/utilities/walletClientValidation
mock.module("@/utilities/walletClientValidation", () => ({
  validateWalletClient: createMockFn(() => true),
  getWalletClientReadinessScore: createMockFn(() => ({ score: 100, isReady: true })),
}));

// Mock @/utilities/grant-helpers
const mockFetchGrantInstance = createMockFn(() => Promise.resolve(null));
mock.module("@/utilities/grant-helpers", () => ({
  fetchGrantInstance: mockFetchGrantInstance,
}));
(globalThis as any).__mocks__.fetchGrantInstance = mockFetchGrantInstance;

// Mock @/utilities/indexer-notification
const mockNotifyIndexerForMilestone = createMockFn(() => Promise.resolve());
mock.module("@/utilities/indexer-notification", () => ({
  notifyIndexerForMilestone: mockNotifyIndexerForMilestone,
}));
(globalThis as any).__mocks__.notifyIndexerForMilestone = mockNotifyIndexerForMilestone;

// Mock @/utilities/attestation-polling
const mockPollForMilestoneStatus = createMockFn(() => Promise.resolve({ status: "complete" }));
mock.module("@/utilities/attestation-polling", () => ({
  pollForMilestoneStatus: mockPollForMilestoneStatus,
}));
(globalThis as any).__mocks__.pollForMilestoneStatus = mockPollForMilestoneStatus;

// Mock @/utilities/walletClientFallback
const mockGetWalletClientWithFallback = createMockFn(() => Promise.resolve(null));
const mockIsWalletClientGoodEnough = createMockFn(() => true);
mock.module("@/utilities/walletClientFallback", () => ({
  getWalletClientWithFallback: mockGetWalletClientWithFallback,
  isWalletClientGoodEnough: mockIsWalletClientGoodEnough,
}));
(globalThis as any).__mocks__.getWalletClientWithFallback = mockGetWalletClientWithFallback;
(globalThis as any).__mocks__.isWalletClientGoodEnough = mockIsWalletClientGoodEnough;

// Mock @/utilities/chainSyncValidation
const mockValidateChainSync = createMockFn(() => Promise.resolve(true));
const mockWaitForChainSync = createMockFn(() => Promise.resolve(true));
mock.module("@/utilities/chainSyncValidation", () => ({
  validateChainSync: mockValidateChainSync,
  waitForChainSync: mockWaitForChainSync,
}));
(globalThis as any).__mocks__.validateChainSync = mockValidateChainSync;
(globalThis as any).__mocks__.waitForChainSync = mockWaitForChainSync;

const mockGetShortErrorMessage = createMockFn(() => "An error occurred");
mock.module("@/utilities/donations/errorMessages", () => ({
  getDetailedErrorInfo: mockGetDetailedErrorInfo,
  parseDonationError: mockParseDonationError,
  getShortErrorMessage: mockGetShortErrorMessage,
  DonationErrorCode: {
    USER_REJECTED: "USER_REJECTED",
    INSUFFICIENT_GAS: "INSUFFICIENT_GAS",
    INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
    NETWORK_MISMATCH: "NETWORK_MISMATCH",
    CONTRACT_ERROR: "CONTRACT_ERROR",
    BALANCE_FETCH_ERROR: "BALANCE_FETCH_ERROR",
    PAYOUT_ADDRESS_ERROR: "PAYOUT_ADDRESS_ERROR",
    APPROVAL_ERROR: "APPROVAL_ERROR",
    PERMIT_SIGNATURE_ERROR: "PERMIT_SIGNATURE_ERROR",
    CHAIN_SYNC_ERROR: "CHAIN_SYNC_ERROR",
    WALLET_CLIENT_ERROR: "WALLET_CLIENT_ERROR",
    TRANSACTION_TIMEOUT: "TRANSACTION_TIMEOUT",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  },
}));
(globalThis as any).__mocks__.getDetailedErrorInfo = mockGetDetailedErrorInfo;
(globalThis as any).__mocks__.parseDonationError = mockParseDonationError;
(globalThis as any).__mocks__.getShortErrorMessage = mockGetShortErrorMessage;

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
// MSW imports it as `{ until }` (named export), not default
mock.module("until-async", () => ({
  until: async <T>(callback: () => Promise<T>): Promise<[Error | null, T | null]> => {
    try {
      const result = await callback();
      return [null, result];
    } catch (error) {
      return [error as Error, null];
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

// Mock @show-karma/karma-gap-sdk IpfsStorage
class MockIpfsStorage {
  async upload(data: unknown) {
    return "QmMockIpfsHash123456789";
  }
  async download(hash: string) {
    return { data: "mock data" };
  }
}
mock.module("@show-karma/karma-gap-sdk/core/class/remote-storage/IpfsStorage", () => ({
  IpfsStorage: MockIpfsStorage,
}));

// Mock Schema class - base class for GapSchema
class MockSchema {
  uid?: string;
  constructor() {}
  static create() {
    return new MockSchema();
  }
}

// Mock GapSchema class
class MockGapSchema extends MockSchema {
  constructor() {
    super();
  }
}

// Mock GAP class
class MockGAP {
  network: any;
  constructor(config?: any) {
    this.network = config?.network || {};
  }
  static async connect() {
    return new MockGAP();
  }
}

// Also mock the main SDK export paths for IpfsStorage
mock.module("@show-karma/karma-gap-sdk", () => ({
  IpfsStorage: MockIpfsStorage,
  GAP: MockGAP,
  GapSchema: MockGapSchema,
  Schema: MockSchema,
}));

// Mock internal SDK paths that may be imported directly
mock.module("@show-karma/karma-gap-sdk/core/class/Schema", () => ({
  Schema: MockSchema,
}));

mock.module("@show-karma/karma-gap-sdk/core/class/GapSchema", () => ({
  GapSchema: MockGapSchema,
}));

mock.module("@show-karma/karma-gap-sdk/core/class/GAP", () => ({
  GAP: MockGAP,
}));

mock.module("@show-karma/karma-gap-sdk/core/class/contract/GapContract", () => ({
  GapContract: class MockGapContract {
    constructor() {}
  },
}));

mock.module("@show-karma/karma-gap-sdk/core/utils/gelato/send-gelato-txn", () => ({
  sendGelatoTxn: createMockFn(() => Promise.resolve("0xmockhash")),
}));

// Mock privy-config
mock.module("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: () => ({}),
}));

// =============================================================================
// Page Component Mocks (for integration tests)
// =============================================================================
// These mocks are pre-registered to solve Jest hoisting issues in Bun.
// Tests that need these mocks will get them applied before any imports.

const React = require("react");

// Mock @/components/Pages/MyProjects
mock.module("@/components/Pages/MyProjects", () => ({
  default: () =>
    React.createElement(
      "div",
      { "data-testid": "mock-my-projects" },
      "Mocked MyProjects Component"
    ),
}));

// Mock @/components/Pages/Project/ProjectPage
mock.module("@/components/Pages/Project/ProjectPage", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "mock-project-page" }, "Mocked Project Page"),
}));

// Mock @/components/Pages/Project/Loading/Overview
mock.module("@/components/Pages/Project/Loading/Overview", () => ({
  ProjectOverviewLoading: () =>
    React.createElement("div", { "data-testid": "project-overview-loading" }, "Loading..."),
}));

// Mock @/components/Pages/NewProjects
mock.module("@/components/Pages/NewProjects", () => ({
  NewProjectsPage: () =>
    React.createElement("div", { "data-testid": "new-projects-page" }, "New Projects Page"),
}));

// Mock @/utilities/indexer/getNewProjects
const mockGetNewProjects = createMockFn(() =>
  Promise.resolve({
    projects: Array(10).fill({}),
    pageInfo: {
      page: 0,
      pageLimit: 10,
      totalItems: 100,
    },
  })
);
mock.module("@/utilities/indexer/getNewProjects", () => ({
  getNewProjects: mockGetNewProjects,
}));
registerMock("@/utilities/indexer/getNewProjects", { getNewProjects: mockGetNewProjects });
(globalThis as any).__mocks__.getNewProjects = mockGetNewProjects;

// Mock Stats component for stats page (named export)
mock.module("@/components/Pages/Stats", () => ({
  Stats: () => React.createElement("div", { "data-testid": "stats-component" }, "Stats Component"),
}));

// =============================================================================
// Homepage Component Mocks
// NOTE: These are intentionally NOT mocked globally because they have dedicated
// unit tests that need the real implementations. Integration tests should mock
// these components individually if needed.
// =============================================================================

// Components with unit tests - NOT MOCKED:
// - @/src/features/homepage/components/hero (hero.test.tsx)
// - @/src/features/homepage/components/how-it-works (how-it-works.test.tsx)

mock.module("@/src/features/homepage/components/live-funding-opportunities", () => ({
  LiveFundingOpportunities: () =>
    React.createElement("section", { "data-testid": "live-funding-opportunities" }),
}));

mock.module("@/src/features/homepage/components/live-funding-opportunities-skeleton", () => ({
  LiveFundingOpportunitiesSkeleton: () =>
    React.createElement("div", { "data-testid": "live-funding-opportunities-skeleton" }),
}));

mock.module("@/src/features/homepage/components/platform-features", () => ({
  PlatformFeatures: () => React.createElement("section", { "data-testid": "platform-features" }),
}));

mock.module("@/src/features/homepage/components/where-builders-grow", () => ({
  WhereBuildersGrow: () => React.createElement("section", { "data-testid": "where-builders-grow" }),
}));

mock.module("@/src/features/homepage/components/join-community", () => ({
  JoinCommunity: () => React.createElement("section", { "data-testid": "join-community" }),
}));

mock.module("@/src/features/homepage/components/faq", () => ({
  FAQ: () => React.createElement("section", { "data-testid": "faq" }),
}));

// =============================================================================
// FundingMap Component Mocks
// NOTE: FundingMapList has dedicated unit tests - NOT MOCKED globally
// =============================================================================

// Components with unit tests - NOT MOCKED:
// - @/src/features/funding-map/components/funding-map-list (FundingMapList.test.tsx)

mock.module("@/src/features/funding-map/components/funding-map-search", () => ({
  FundingMapSearch: () => React.createElement("div", { "data-testid": "funding-map-search" }),
}));

mock.module("@/src/features/funding-map/components/funding-map-sidebar", () => ({
  FundingMapSidebar: () => React.createElement("div", { "data-testid": "funding-map-sidebar" }),
}));

// =============================================================================
// Application List Component Mocks
// =============================================================================

// Mock SortableTableHeader for AI Score tests
mock.module("@/components/Utilities/SortableTableHeader", () => ({
  default: ({
    label,
    sortKey,
    onSort,
  }: {
    label: string;
    sortKey: string;
    onSort?: (sortKey: string) => void;
  }) =>
    React.createElement(
      "th",
      { scope: "col", "data-testid": `header-${sortKey}` },
      React.createElement("button", { onClick: () => onSort?.(sortKey) }, label)
    ),
}));

// Note: We do NOT mock @/components/FundingPlatform/helper/getAIScore globally
// because there are unit tests that need to test the real implementation.
// Integration tests for ApplicationList use the real formatAIScore function
// to format AI scores displayed in the table.

// Mock getProjectTitle helper
mock.module("@/components/FundingPlatform/helper/getProjecTitle", () => ({
  getProjectTitle: createMockFn(() => "Test Project"),
}));

// NOTE: formatDate is NOT mocked globally because utilities/__tests__/formatDate.test.ts
// needs to test the real implementation. Tests that need a mock should define it locally.

// Mock ReviewerAssignmentDropdown
mock.module("@/components/FundingPlatform/ApplicationList/ReviewerAssignmentDropdown", () => ({
  ReviewerAssignmentDropdown: () =>
    React.createElement("div", { "data-testid": "reviewer-assignment-dropdown" }),
}));

// =============================================================================
// Layout Component Mocks
// =============================================================================

// Mock @vercel/speed-insights/next
mock.module("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => React.createElement("div", { "data-testid": "speed-insights" }),
}));

// Mock @vercel/analytics/react
mock.module("@vercel/analytics/react", () => ({
  Analytics: () => React.createElement("div", { "data-testid": "analytics" }),
}));

// Mock @next/third-parties/google
mock.module("@next/third-parties/google", () => ({
  GoogleAnalytics: () => React.createElement("div", { "data-testid": "google-analytics" }),
}));

// NOTE: Footer and Navbar have dedicated unit tests - NOT MOCKED globally
// - @/src/components/footer/footer (Footer.test.tsx)
// - @/src/components/navbar/navbar (Navbar.test.tsx)

// Mock @/components/Dialogs/ContributorProfileDialog
mock.module("@/components/Dialogs/ContributorProfileDialog", () => ({
  ContributorProfileDialog: () =>
    React.createElement("div", { "data-testid": "contributor-profile-dialog" }),
}));

// Mock @/components/Dialogs/OnboardingDialog
mock.module("@/components/Dialogs/OnboardingDialog", () => ({
  OnboardingDialog: () => React.createElement("div", { "data-testid": "onboarding-dialog" }),
}));

// Mock @/components/Utilities/PermissionsProvider
mock.module("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: ({ children }: { children: unknown }) =>
    React.createElement("div", { "data-testid": "permissions-provider" }, children),
}));

// Mock @/components/ProgressBarWrapper
mock.module("@/components/ProgressBarWrapper", () => ({
  ProgressBarWrapper: () => React.createElement("div", { "data-testid": "progress-bar-wrapper" }),
}));

// Mock @/components/Utilities/HotjarAnalytics
mock.module("@/components/Utilities/HotjarAnalytics", () => ({
  default: () => React.createElement("div", { "data-testid": "hotjar-analytics" }),
}));

// Mock next-themes
mock.module("next-themes", () => ({
  ThemeProvider: ({ children }: { children: unknown }) =>
    React.createElement("div", { "data-testid": "theme-provider" }, children),
  useTheme: () => ({
    theme: "light",
    setTheme: () => {},
    resolvedTheme: "light",
    themes: ["light", "dark"],
  }),
}));

// =============================================================================
// Authentication & API Mocks for Integration Tests
// =============================================================================

// Mock api-client for comments and other authenticated API calls
const mockApiClientInstance = {
  get: createMockFn(),
  post: createMockFn(),
  put: createMockFn(),
  delete: createMockFn(),
  patch: createMockFn(),
  request: createMockFn(),
  head: createMockFn(),
  options: createMockFn(),
  interceptors: {
    request: { use: createMockFn(), eject: createMockFn(), clear: createMockFn() },
    response: { use: createMockFn(), eject: createMockFn(), clear: createMockFn() },
  },
  defaults: { headers: { common: {} } },
  getUri: createMockFn(),
};

mock.module("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: createMockFn(() => mockApiClientInstance),
}));

// Export for test access
(globalThis as any).__mocks__.apiClient = mockApiClientInstance;

// Mock getWalletFromWagmiStore
mock.module("@/utilities/getWalletFromWagmiStore", () => ({
  getWalletFromWagmiStore: createMockFn(() => "0x1234567890abcdef"),
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
  // Clean up DOM between tests to prevent test pollution
  rtlCleanup();
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
