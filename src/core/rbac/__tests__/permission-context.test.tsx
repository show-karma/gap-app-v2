import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PermissionProvider, usePermissionContext } from "../context/permission-context";
import { usePermissionsQuery } from "../hooks/use-permissions";
import { Permission } from "../types/permission";
import { Role } from "../types/role";

// PermissionProvider uses usePrivyBridge (not usePrivy + useAccount directly)
const mockPrivyBridgeState = {
  ready: false,
  authenticated: false,
  user: null as any,
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  connectWallet: vi.fn(),
  wallets: [] as any[],
  isConnected: false,
  smartWalletClient: null,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockPrivyBridgeState,
  PRIVY_BRIDGE_DEFAULTS: {
    ready: false,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: async () => null,
    connectWallet: vi.fn(),
    wallets: [],
    isConnected: false,
  },
}));

vi.mock("../hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(),
}));

const mockUsePermissionsQuery = usePermissionsQuery as unknown as vi.Mock;

describe("PermissionProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PermissionProvider>{children}</PermissionProvider>
  );
  const previousE2EBypassFlag = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    delete (window as Window & { __e2e?: unknown }).__e2e;
    delete (window as Window & { __playwright?: unknown }).__playwright;
    localStorage.removeItem("privy:auth_state");

    // Reset privy bridge state defaults
    mockPrivyBridgeState.ready = false;
    mockPrivyBridgeState.authenticated = false;

    mockUsePermissionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    if (previousE2EBypassFlag === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
    } else {
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = previousE2EBypassFlag;
    }
    delete (window as Window & { __e2e?: unknown }).__e2e;
    delete (window as Window & { __playwright?: unknown }).__playwright;
    localStorage.removeItem("privy:auth_state");
  });

  it("enables permissions query for E2E mock-authenticated sessions", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem("privy:auth_state", JSON.stringify({ authenticated: true }));

    mockUsePermissionsQuery.mockReturnValue({
      data: {
        roles: {
          primaryRole: Role.PROGRAM_ADMIN,
          roles: [Role.PROGRAM_ADMIN],
          reviewerTypes: [],
        },
        permissions: [Permission.PROGRAM_VIEW],
        resourceContext: {},
        isCommunityAdmin: false,
        isProgramAdmin: true,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: true });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isProgramAdmin).toBe(true);
    expect(result.current.can(Permission.PROGRAM_VIEW)).toBe(true);
  });

  it("does not enable permissions query for malformed E2E auth payloads", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem("privy:auth_state", "{bad-json");

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: false });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isGuestDueToError).toBe(false);
  });

  it("does not enable query when bypass flag is disabled", () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem("privy:auth_state", JSON.stringify({ authenticated: true }));

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: false });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isGuestDueToError).toBe(false);
  });

  describe("Wagmi initialization race condition", () => {
    it("reports isLoading=true when Privy is ready+authenticated but permissions query not yet complete", () => {
      mockPrivyBridgeState.ready = true;
      mockPrivyBridgeState.authenticated = true;

      mockUsePermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=true when Privy is ready+authenticated and no data yet", () => {
      mockPrivyBridgeState.ready = true;
      mockPrivyBridgeState.authenticated = true;

      mockUsePermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      // authenticated + no data + no error => awaitingPermissions => isLoading=true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=false once Privy is ready+authenticated and permissions load", () => {
      mockPrivyBridgeState.ready = true;
      mockPrivyBridgeState.authenticated = true;

      mockUsePermissionsQuery.mockReturnValue({
        data: {
          roles: {
            primaryRole: Role.COMMUNITY_ADMIN,
            roles: [Role.COMMUNITY_ADMIN],
            reviewerTypes: [],
          },
          permissions: [Permission.PROGRAM_VIEW],
          resourceContext: {},
          isCommunityAdmin: true,
          isProgramAdmin: false,
          isReviewer: false,
          isRegistryAdmin: false,
          isProgramCreator: false,
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCommunityAdmin).toBe(true);
    });

    it("reports isLoading=true when Privy is authenticated but permissions query pending", () => {
      mockPrivyBridgeState.ready = true;
      mockPrivyBridgeState.authenticated = true;

      mockUsePermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("does not report loading for genuinely unauthenticated users", () => {
      mockPrivyBridgeState.ready = true;
      mockPrivyBridgeState.authenticated = false;

      mockUsePermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.roles.primaryRole).toBe(Role.GUEST);
    });
  });
});
