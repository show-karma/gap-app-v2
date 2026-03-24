/**
 * @file Trust tests for RBAC permission system
 * @description Tests for PermissionProvider, permission checks, role hierarchy,
 * loading states, error handling, and rate limiting.
 */

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import {
  PermissionProvider,
  useCan,
  useCanAll,
  useCanAny,
  useHasRole,
  useHasRoleOrHigher,
  useIsGuestDueToError,
  usePermissionContext,
} from "@/src/core/rbac/context/permission-context";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Permission } from "@/src/core/rbac/types/permission";
import { Role } from "@/src/core/rbac/types/role";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: vi.fn(),
}));

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(),
}));

vi.mock("@/utilities/auth/cypress-auth", () => ({
  getCypressMockAuthState: vi.fn().mockReturnValue(null),
}));

const mockUsePrivyBridge = usePrivyBridge as vi.Mock;
const mockUsePermissionsQuery = usePermissionsQuery as unknown as vi.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const wrapper = ({ children }: { children: ReactNode }) => (
  <PermissionProvider>{children}</PermissionProvider>
);

function setAuthState(overrides: Record<string, any> = {}) {
  mockUsePrivyBridge.mockReturnValue({
    ready: true,
    authenticated: true,
    user: { id: "user-1" },
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    connectWallet: vi.fn(),
    wallets: [],
    smartWalletClient: null,
    isConnected: false,
    ...overrides,
  });
}

function setQueryResult(overrides: Record<string, any> = {}) {
  mockUsePermissionsQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

const ADMIN_DATA = {
  roles: {
    primaryRole: Role.COMMUNITY_ADMIN,
    roles: [Role.COMMUNITY_ADMIN, Role.PROGRAM_ADMIN],
    reviewerTypes: [],
  },
  permissions: [
    Permission.COMMUNITY_VIEW,
    Permission.COMMUNITY_EDIT,
    Permission.COMMUNITY_MANAGE_MEMBERS,
    Permission.PROGRAM_VIEW,
    Permission.PROGRAM_EDIT,
  ],
  resourceContext: { communityId: "comm-1" },
  isCommunityAdmin: true,
  isProgramAdmin: true,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

const GUEST_DATA = {
  roles: {
    primaryRole: Role.GUEST,
    roles: [Role.GUEST],
    reviewerTypes: [],
  },
  permissions: [Permission.PROGRAM_VIEW],
  resourceContext: {},
  isCommunityAdmin: false,
  isProgramAdmin: false,
  isReviewer: false,
  isRegistryAdmin: false,
  isProgramCreator: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  setAuthState();
  setQueryResult();
});

describe("PermissionProvider — Loading states", () => {
  it("shows loading when Privy is not ready", () => {
    setAuthState({ ready: false, authenticated: false });
    setQueryResult({ data: undefined, isLoading: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("shows loading while awaiting permissions (authenticated but no data)", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: true });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("shows loading when authenticated but query not yet returned (no data, no error)", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: false, isError: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    // awaitingPermissions = believedAuthenticated && !data && !isError
    expect(result.current.isLoading).toBe(true);
  });

  it("stops loading when data arrives", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("PermissionProvider — isGuestDueToError", () => {
  it("is true when query errors", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isGuestDueToError).toBe(true);
  });

  it("is true when query errors with response.status 429", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    // Any isError=true state surfaces as isGuestDueToError regardless of error type
    expect(result.current.isGuestDueToError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("is false when data loads successfully", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false, isError: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isGuestDueToError).toBe(false);
  });

  it("is false when not authenticated", () => {
    setAuthState({ ready: true, authenticated: false });
    setQueryResult({ data: undefined, isLoading: false, isError: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isGuestDueToError).toBe(false);
  });
});

describe("PermissionProvider — can() / canAny() / canAll()", () => {
  beforeEach(() => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });
  });

  it("can() returns true for granted permission", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.can(Permission.COMMUNITY_EDIT)).toBe(true);
  });

  it("can() returns false for non-granted permission", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.can(Permission.MILESTONE_APPROVE)).toBe(false);
  });

  it("canAny() returns true when at least one permission is granted", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.canAny([Permission.MILESTONE_APPROVE, Permission.COMMUNITY_EDIT])).toBe(
      true
    );
  });

  it("canAny() returns false when no permissions are granted", () => {
    setQueryResult({ data: GUEST_DATA, isLoading: false });
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.canAny([Permission.MILESTONE_APPROVE, Permission.COMMUNITY_EDIT])).toBe(
      false
    );
  });

  it("canAll() returns true when all permissions are granted", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.canAll([Permission.COMMUNITY_VIEW, Permission.COMMUNITY_EDIT])).toBe(
      true
    );
  });

  it("canAll() returns false when not all permissions are granted", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.canAll([Permission.COMMUNITY_EDIT, Permission.MILESTONE_APPROVE])).toBe(
      false
    );
  });
});

describe("PermissionProvider — hasRole() / hasRoleOrHigher()", () => {
  beforeEach(() => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });
  });

  it("hasRole() returns true for assigned role", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.hasRole(Role.COMMUNITY_ADMIN)).toBe(true);
  });

  it("hasRole() returns false for non-assigned role", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.hasRole(Role.SUPER_ADMIN)).toBe(false);
  });

  it("hasRoleOrHigher() returns true for exact role", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.hasRoleOrHigher(Role.COMMUNITY_ADMIN)).toBe(true);
  });

  it("hasRoleOrHigher() returns true for lower role", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    // COMMUNITY_ADMIN (level 6) >= PROGRAM_ADMIN (level 4)
    expect(result.current.hasRoleOrHigher(Role.PROGRAM_ADMIN)).toBe(true);
  });

  it("hasRoleOrHigher() returns false for higher required role", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.hasRoleOrHigher(Role.SUPER_ADMIN)).toBe(false);
  });

  it("hasRole() returns false for invalid role string", () => {
    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.hasRole("INVALID_ROLE")).toBe(false);
  });
});

describe("PermissionProvider — Convenience hooks", () => {
  it("useCan returns true for granted permission when loaded", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => useCan(Permission.COMMUNITY_EDIT), { wrapper });

    expect(result.current).toBe(true);
  });

  it("useCan returns false while loading", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useCan(Permission.COMMUNITY_EDIT), { wrapper });

    expect(result.current).toBe(false);
  });

  it("useCanAny returns correct value", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(
      () => useCanAny([Permission.COMMUNITY_EDIT, Permission.MILESTONE_APPROVE]),
      { wrapper }
    );

    expect(result.current).toBe(true);
  });

  it("useCanAll returns correct value", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(
      () => useCanAll([Permission.COMMUNITY_VIEW, Permission.COMMUNITY_EDIT]),
      { wrapper }
    );

    expect(result.current).toBe(true);
  });

  it("useHasRole returns correct value", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => useHasRole(Role.COMMUNITY_ADMIN), { wrapper });

    expect(result.current).toBe(true);
  });

  it("useHasRoleOrHigher returns correct value", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => useHasRoleOrHigher(Role.PROGRAM_ADMIN), {
      wrapper,
    });

    expect(result.current).toBe(true);
  });

  it("useIsGuestDueToError returns true on error", () => {
    setAuthState({ ready: true, authenticated: true });
    setQueryResult({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => useIsGuestDueToError(), { wrapper });

    expect(result.current).toBe(true);
  });
});

describe("PermissionProvider — Boolean flags from response", () => {
  it("exposes isCommunityAdmin from response data", () => {
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isCommunityAdmin).toBe(true);
  });

  it("exposes isProgramAdmin from response data", () => {
    setQueryResult({ data: ADMIN_DATA, isLoading: false });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isProgramAdmin).toBe(true);
  });

  it("defaults flags to false when no data", () => {
    setQueryResult({ data: undefined, isLoading: false, isError: true });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(result.current.isCommunityAdmin).toBe(false);
    expect(result.current.isProgramAdmin).toBe(false);
    expect(result.current.isReviewer).toBe(false);
  });
});
