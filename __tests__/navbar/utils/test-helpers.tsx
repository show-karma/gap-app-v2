/**
 * Test helpers and utilities for navbar testing
 * Provides common setup functions, mocks, and utilities
 */

import React from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthFixture } from "../fixtures/auth-fixtures";
import { mockAuthState, mockThemeState } from "../setup";

/**
 * Reset mock auth state to default
 */
export const resetMockAuthState = () => {
  mockAuthState.current = {
    ready: true,
    authenticated: false,
    isConnected: false,
    address: undefined,
    user: null,
    authenticate: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    disconnect: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  };
};

/**
 * Reset mock theme state to default
 */
export const resetMockThemeState = () => {
  mockThemeState.current = {
    theme: "light",
    setTheme: jest.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
    resolvedTheme: "light",
  };
};

/**
 * Reset all permission mocks to default
 */
export const resetPermissionMocks = () => {
  // Reset communities store
  const communitiesModule = require("@/store/communities");
  if (communitiesModule.useCommunitiesStore && jest.isMockFunction(communitiesModule.useCommunitiesStore)) {
    communitiesModule.useCommunitiesStore.mockReturnValue({ communities: [], setCommunities: jest.fn(), isLoading: false, setIsLoading: jest.fn() });
  }

  // Reset reviewer programs
  const permissionsModule = require("@/hooks/usePermissions");
  if (permissionsModule.useReviewerPrograms && jest.isMockFunction(permissionsModule.useReviewerPrograms)) {
    permissionsModule.useReviewerPrograms.mockReturnValue({ isReviewerOfProgram: false, data: [], isLoading: false });
  }

  // Reset staff
  const staffModule = require("@/hooks/useStaff");
  if (staffModule.useStaff && jest.isMockFunction(staffModule.useStaff)) {
    staffModule.useStaff.mockReturnValue({ isStaff: false });
  }

  // Reset owner store (with selector support)
  const ownerModule = require("@/store/owner");
  if (ownerModule.useOwnerStore && jest.isMockFunction(ownerModule.useOwnerStore)) {
    ownerModule.useOwnerStore.mockImplementation((selector?: Function) => {
      const state = { isProjectOwner: false, isOwner: false };
      return selector ? selector(state) : state;
    });
  }
  
  // Also reset in @/store (index)
  const storeModule = require("@/store");
  if (storeModule.useOwnerStore && jest.isMockFunction(storeModule.useOwnerStore)) {
    storeModule.useOwnerStore.mockImplementation((selector?: Function) => {
      const state = { isProjectOwner: false, isOwner: false };
      return selector ? selector(state) : state;
    });
  }

  // Reset registry store
  const registryModule = require("@/store/registry");
  if (registryModule.useRegistryStore && jest.isMockFunction(registryModule.useRegistryStore)) {
    registryModule.useRegistryStore.mockReturnValue({ isPoolManager: false, isRegistryAdmin: false });
  }

  // Reset contributor profile modal store
  const modalModule = require("@/store/modals/contributorProfile");
  if (modalModule.useContributorProfileModalStore && jest.isMockFunction(modalModule.useContributorProfileModalStore)) {
    modalModule.useContributorProfileModalStore.mockReturnValue({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() });
  }
};

/**
 * Custom render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  authState?: AuthFixture["authState"];
  permissions?: AuthFixture["permissions"];
  theme?: "light" | "dark";
  queryClient?: QueryClient;
  mockUseAuth?: ReturnType<typeof createMockUseAuth>;
  mockUsePrivy?: ReturnType<typeof createMockUseAuth>;
  mockPermissions?: ReturnType<typeof createMockPermissions>;
  mockUseLogout?: ReturnType<typeof createMockUseLogoutFunction>;
  mockModalStore?: ReturnType<typeof createMockModalStore>;
  // Individual store mocks
  mockUseCommunitiesStore?: any;
  mockUseReviewerPrograms?: any;
  mockUseStaff?: any;
  mockUseOwnerStore?: any;
  mockUseRegistryStore?: any;
  mockUseContributorProfileModalStore?: any;
  // Router mock
  mockRouter?: any;
  // Theme mock
  mockUseTheme?: any;
}

/**
 * Mock implementations for hooks
 */
export const createMockUseAuth = (authState: AuthFixture["authState"] | any) => ({
  ready: authState.ready ?? true,
  authenticated: authState.authenticated ?? false,
  isConnected: authState.isConnected ?? false,
  address: authState.address,
  user: authState.user,
  authenticate: authState.authenticate || jest.fn(),
  login: authState.login || jest.fn(),
  logout: authState.logout || jest.fn(),
  disconnect: authState.disconnect || jest.fn(),
  getAccessToken: authState.getAccessToken || jest.fn().mockResolvedValue("mock-token"),
  primaryWallet: authState.address ? { address: authState.address } : undefined,
  wallets: authState.address ? [{ address: authState.address }] : [],
  ...authState, // Allow any additional overrides
});

/**
 * Alias for createMockUseAuth to support integration tests
 * Integration tests were written using createMockUsePrivy naming
 */
export const createMockUsePrivy = createMockUseAuth;

/**
 * Create mock permissions object from permission state
 */
export const createMockPermissions = (permissions: AuthFixture["permissions"]) => ({
  mockUseCommunitiesStore: createMockUseCommunitiesStore(permissions.communities),
  mockUseReviewerPrograms: createMockUseReviewerPrograms(permissions.reviewerPrograms),
  mockUseStaff: createMockUseStaff(permissions.isStaff),
  mockUseOwnerStore: createMockUseOwnerStore(permissions.isOwner),
  mockUseRegistryStore: createMockUseRegistryStore(permissions.isPoolManager, permissions.isRegistryAdmin),
});

/**
 * Create mock logout function
 */
export const createMockUseLogoutFunction = (logoutFn: jest.Mock) => () => ({
  logout: logoutFn,
});

/**
 * Create mock modal store
 */
export const createMockModalStore = (options?: { isOpen?: boolean; openModal?: jest.Mock; closeModal?: jest.Mock } | boolean) => {
  // Support both old signature (boolean) and new signature (object)
  if (typeof options === 'boolean' || options === undefined) {
    return () => ({
      isOpen: options || false,
      openModal: jest.fn(),
      closeModal: jest.fn(),
    });
  }
  return () => ({
    isOpen: options.isOpen || false,
    openModal: options.openModal || jest.fn(),
    closeModal: options.closeModal || jest.fn(),
  });
};

/**
 * Create mock router (Next.js)
 */
export const createMockRouter = (overrides: any = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  ...overrides,
});

/**
 * Update global mocks (for use with rerender)
 */
export const updateMocks = (options: Partial<CustomRenderOptions>) => {
  const {
    mockUseAuth,
    mockUsePrivy,
    mockPermissions,
    mockUseLogout,
    mockModalStore,
    mockUseCommunitiesStore,
    mockUseReviewerPrograms,
    mockUseStaff,
    mockUseOwnerStore,
    mockUseRegistryStore,
    mockRouter,
    mockUseTheme,
    mockUseContributorProfileModalStore,
  } = options;

  // Update auth mock
  if (mockUseAuth || mockUsePrivy) {
    const authMock = mockUseAuth || mockUsePrivy;
    mockAuthState.current = authMock;
  }

  // Update theme mock
  if (mockUseTheme) {
    const themeMock = typeof mockUseTheme === 'function' ? mockUseTheme() : mockUseTheme;
    mockThemeState.current = themeMock;
  }

  // Update contributor profile modal store mock
  if (mockUseContributorProfileModalStore) {
    const modalMock = typeof mockUseContributorProfileModalStore === 'function' 
      ? mockUseContributorProfileModalStore() 
      : mockUseContributorProfileModalStore;
    const module = require("@/store/modals/contributorProfile");
    if (module.useContributorProfileModalStore && jest.isMockFunction(module.useContributorProfileModalStore)) {
      module.useContributorProfileModalStore.mockReturnValue(modalMock);
    }
  }

  // Update permissions mocks
  if (mockPermissions) {
    const { mockUseCommunitiesStore: communitiesStore, mockUseReviewerPrograms: reviewerPrograms, mockUseStaff: staff, mockUseOwnerStore: owner, mockUseRegistryStore: registry } = mockPermissions;
    
    if (communitiesStore) {
      const module = require("@/store/communities");
      if (module.useCommunitiesStore && jest.isMockFunction(module.useCommunitiesStore)) {
        module.useCommunitiesStore.mockReturnValue(communitiesStore);
      }
    }
    
    if (reviewerPrograms) {
      const module = require("@/hooks/usePermissions");
      if (module.useReviewerPrograms && jest.isMockFunction(module.useReviewerPrograms)) {
        module.useReviewerPrograms.mockReturnValue(reviewerPrograms);
      }
    }
    
    if (staff) {
      const module = require("@/hooks/useStaff");
      if (module.useStaff && jest.isMockFunction(module.useStaff)) {
        module.useStaff.mockReturnValue(staff);
      }
    }
    
    if (owner) {
      const ownerModule = require("@/store/owner");
      const storeModule = require("@/store");
      // Handle Zustand selector pattern
      const ownerImpl = typeof owner === 'function' ? owner : (selector?: Function) => (selector ? selector(owner) : owner);
      
      if (ownerModule.useOwnerStore && jest.isMockFunction(ownerModule.useOwnerStore)) {
        ownerModule.useOwnerStore.mockImplementation(ownerImpl);
      }
      if (storeModule.useOwnerStore && jest.isMockFunction(storeModule.useOwnerStore)) {
        storeModule.useOwnerStore.mockImplementation(ownerImpl);
      }
    }
    
    if (registry) {
      const module = require("@/store/registry");
      if (module.useRegistryStore && jest.isMockFunction(module.useRegistryStore)) {
        module.useRegistryStore.mockReturnValue(registry);
      }
    }
  }

  // Individual store mocks
  if (mockUseCommunitiesStore) {
    const module = require("@/store/communities");
    if (module.useCommunitiesStore && jest.isMockFunction(module.useCommunitiesStore)) {
      module.useCommunitiesStore.mockReturnValue(mockUseCommunitiesStore);
    }
  }

  // Add other individual mock updates as needed
};

export const createMockUseCommunitiesStore = (communities: AuthFixture["permissions"]["communities"]) => ({
  communities,
  setCommunities: jest.fn(),
  isLoading: false,
  setIsLoading: jest.fn(),
});

export const createMockUseReviewerPrograms = (programs: AuthFixture["permissions"]["reviewerPrograms"]) => ({
  programs,
  isLoading: false,
  hasPrograms: programs.length > 0,
  error: null,
  refetch: jest.fn(),
});

export const createMockUseStaff = (isStaff: boolean) => ({
  isStaff,
  isLoading: false,
  error: null,
});

export const createMockUseOwnerStore = (isOwner: boolean) => {
  const state = { isProjectOwner: false, isOwner };
  return jest.fn((selector?: Function) => (selector ? selector(state) : state));
};

export const createMockUseRegistryStore = (isPoolManager: boolean, isRegistryAdmin: boolean) => ({
  isPoolManager,
  isRegistryAdmin,
  setIsPoolManager: jest.fn(),
  setIsRegistryAdmin: jest.fn(),
  isPoolManagerLoading: false,
  isRegistryAdminLoading: false,
  setIsPoolManagerLoading: jest.fn(),
  setIsRegistryAdminLoading: jest.fn(),
});

export const createMockUseTheme = (themeOrOverrides: "light" | "dark" | any = "light") => {
  // Support both old signature (string) and new signature (object with overrides)
  if (typeof themeOrOverrides === "string") {
    return {
      theme: themeOrOverrides,
      setTheme: jest.fn(),
      themes: ["light", "dark"],
      systemTheme: "light",
      resolvedTheme: themeOrOverrides,
    };
  }
  // Object with overrides
  const overrides = themeOrOverrides;
  return {
    theme: overrides.theme || "light",
    setTheme: overrides.setTheme || jest.fn(),
    themes: overrides.themes || ["light", "dark"],
    systemTheme: overrides.systemTheme || "light",
    resolvedTheme: overrides.resolvedTheme || overrides.theme || "light",
    ...overrides,
  };
};

export const createMockUseContributorProfileModalStore = () => ({
  isOpen: false,
  openModal: jest.fn(),
  closeModal: jest.fn(),
});

/**
 * Setup all mocks for a given auth fixture
 */
export const setupAuthMocks = (authState: AuthFixture["authState"], permissions: AuthFixture["permissions"]) => {
  // Mock useAuth
  jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(() => createMockUseAuth(authState)),
  }));

  // Mock useCommunitiesStore
  jest.mock("@/store/communities", () => ({
    useCommunitiesStore: jest.fn(() => createMockUseCommunitiesStore(permissions.communities)),
  }));

  // Mock useReviewerPrograms
  jest.mock("@/hooks/usePermissions", () => ({
    useReviewerPrograms: jest.fn(() => createMockUseReviewerPrograms(permissions.reviewerPrograms)),
  }));

  // Mock useStaff
  jest.mock("@/hooks/useStaff", () => ({
    useStaff: jest.fn(() => createMockUseStaff(permissions.isStaff)),
  }));

  // Mock useOwnerStore
  jest.mock("@/store/owner", () => ({
    useOwnerStore: createMockUseOwnerStore(permissions.isOwner),
  }));

  // Mock useRegistryStore
  jest.mock("@/store/registry", () => ({
    useRegistryStore: jest.fn(() => createMockUseRegistryStore(permissions.isPoolManager, permissions.isRegistryAdmin)),
  }));

  // Mock useTheme
  jest.mock("next-themes", () => ({
    useTheme: jest.fn(() => createMockUseTheme()),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }));

  // Mock useContributorProfileModalStore
  jest.mock("@/store/modals/contributorProfile", () => ({
    useContributorProfileModalStore: jest.fn(() => createMockUseContributorProfileModalStore()),
  }));

  // Mock Next.js router
  jest.mock("next/navigation", () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    })),
    usePathname: jest.fn(() => "/"),
  }));
};

/**
 * Create a test query client
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * All providers wrapper
 */
export const AllProviders: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
  theme?: "light" | "dark";
}> = ({ children, queryClient, theme = "light" }) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/**
 * Custom render with providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const {
    authState,
    permissions,
    theme = "light",
    queryClient,
    mockUseAuth,
    mockUsePrivy,
    mockPermissions,
    mockUseLogout,
    mockModalStore,
    mockUseTheme,
    mockUseContributorProfileModalStore,
    ...renderOptions
  } = options;

  // Setup mocks if provided - modify the global mock state
  if (mockUseAuth || mockUsePrivy) {
    const authMock = mockUseAuth || mockUsePrivy;
    // Modify the imported mockAuthState
    mockAuthState.current = authMock;
  }

  // Setup theme mock
  if (mockUseTheme) {
    const themeMock = typeof mockUseTheme === 'function' ? mockUseTheme() : mockUseTheme;
    mockThemeState.current = themeMock;
  }
  
  if (mockPermissions) {
    const { mockUseCommunitiesStore, mockUseReviewerPrograms, mockUseStaff, mockUseOwnerStore, mockUseRegistryStore } = mockPermissions;
    
    if (mockUseCommunitiesStore) {
      const module = require("@/store/communities");
      if (module.useCommunitiesStore && jest.isMockFunction(module.useCommunitiesStore)) {
        module.useCommunitiesStore.mockReturnValue(mockUseCommunitiesStore);
      }
    }
    
    if (mockUseReviewerPrograms) {
      const module = require("@/hooks/usePermissions");
      if (module.useReviewerPrograms && jest.isMockFunction(module.useReviewerPrograms)) {
        module.useReviewerPrograms.mockReturnValue(mockUseReviewerPrograms);
      }
    }
    
    if (mockUseStaff) {
      const module = require("@/hooks/useStaff");
      if (module.useStaff && jest.isMockFunction(module.useStaff)) {
        module.useStaff.mockReturnValue(mockUseStaff);
      }
    }
    
    if (mockUseOwnerStore) {
      const ownerModule = require("@/store/owner");
      const storeModule = require("@/store");
      // Handle Zustand selector pattern
      const ownerImpl = typeof mockUseOwnerStore === 'function' ? mockUseOwnerStore : (selector?: Function) => (selector ? selector(mockUseOwnerStore) : mockUseOwnerStore);
      
      if (ownerModule.useOwnerStore && jest.isMockFunction(ownerModule.useOwnerStore)) {
        ownerModule.useOwnerStore.mockImplementation(ownerImpl);
      }
      if (storeModule.useOwnerStore && jest.isMockFunction(storeModule.useOwnerStore)) {
        storeModule.useOwnerStore.mockImplementation(ownerImpl);
      }
    }
    
    if (mockUseRegistryStore) {
      const module = require("@/store/registry");
      if (module.useRegistryStore && jest.isMockFunction(module.useRegistryStore)) {
        module.useRegistryStore.mockReturnValue(mockUseRegistryStore);
      }
    }
  }

  // Setup contributor profile modal store mock
  if (mockUseContributorProfileModalStore) {
    const modalMock = typeof mockUseContributorProfileModalStore === 'function' 
      ? mockUseContributorProfileModalStore() 
      : mockUseContributorProfileModalStore;
    const module = require("@/store/modals/contributorProfile");
    if (module.useContributorProfileModalStore && jest.isMockFunction(module.useContributorProfileModalStore)) {
      module.useContributorProfileModalStore.mockReturnValue(modalMock);
    }
  }

  // Setup mocks if auth state and permissions provided (legacy support)
  if (authState && permissions) {
    setupAuthMocks(authState, permissions);
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllProviders queryClient={queryClient} theme={theme}>
      {children}
    </AllProviders>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Create custom rerender that accepts options
  const customRerender = (ui: React.ReactElement, options?: Partial<CustomRenderOptions>) => {
    if (options) {
      // Update mocks before rerendering
      updateMocks(options);
    }
    return renderResult.rerender(ui);
  };

  return {
    ...renderResult,
    rerender: customRerender,
  };
};

/**
 * Viewport simulation helpers
 */
export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
};

export const setViewport = (viewport: keyof typeof viewports) => {
  const { width, height } = viewports[viewport];
  setViewportSize(width, height);
};

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

/**
 * Helper to simulate click outside
 */
export const simulateClickOutside = (element: HTMLElement) => {
  const event = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  document.body.dispatchEvent(event);
};

/**
 * Helper to wait for debounce
 */
export const waitForDebounce = async (delay: number = 500) => {
  return new Promise((resolve) => setTimeout(resolve, delay + 50));
};

/**
 * Helper to format address (same as navbar component)
 */
export const formatAddress = (addr: string): string => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

/**
 * Helper to create mock DOM elements for modal triggers
 */
export const createMockModalButton = (id: string) => {
  const button = document.createElement("button");
  button.id = id;
  button.onclick = jest.fn();
  document.body.appendChild(button);
  return button;
};

/**
 * Helper to clean up mock DOM elements
 */
export const cleanupMockElements = () => {
  document.body.innerHTML = "";
};

/**
 * Helper to get computed styles for accessibility testing
 */
export const getComputedColor = (element: HTMLElement): string => {
  return window.getComputedStyle(element).color;
};

export const getComputedBackgroundColor = (element: HTMLElement): string => {
  return window.getComputedStyle(element).backgroundColor;
};

/**
 * Helper to calculate contrast ratio (for accessibility tests)
 */
export const calculateContrastRatio = (foreground: string, background: string): number => {
  // Simplified contrast ratio calculation
  // In real tests, use a proper library like polished or color
  const getLuminance = (color: string): number => {
    // Extract RGB values and calculate relative luminance
    // This is a simplified version
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0;
    const [r, g, b] = rgb.map((val) => {
      const normalized = parseInt(val) / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Helper to check if element is keyboard accessible
 */
export const isKeyboardAccessible = (element: HTMLElement): boolean => {
  const tabIndex = element.getAttribute("tabindex");
  const role = element.getAttribute("role");
  const tagName = element.tagName.toLowerCase();

  return (
    tabIndex !== null ||
    ["button", "a", "input", "select", "textarea"].includes(tagName) ||
    role === "button" ||
    role === "link"
  );
};

/**
 * Assertion helpers
 */
export const expectElementToBeVisible = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToBeHidden = (element: HTMLElement | null) => {
  if (element) {
    expect(element).not.toBeVisible();
  } else {
    expect(element).not.toBeInTheDocument();
  }
};

export const expectElementToHaveAriaLabel = (element: HTMLElement, label?: string) => {
  const ariaLabel = element.getAttribute("aria-label");
  if (label) {
    expect(ariaLabel).toBe(label);
  } else {
    expect(ariaLabel).toBeTruthy();
  }
};

/**
 * Re-export commonly used testing utilities
 */
export {
  screen,
  waitFor,
  within,
  fireEvent,
  act,
} from "@testing-library/react";

export { default as userEvent } from "@testing-library/user-event";

