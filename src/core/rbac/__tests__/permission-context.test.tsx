import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { PermissionProvider, usePermissionContext } from "../context/permission-context";
import { usePermissionsQuery } from "../hooks/use-permissions";
import { Permission } from "../types/permission";
import { Role } from "../types/role";

jest.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: jest.fn(),
}));

jest.mock("../hooks/use-permissions", () => ({
  usePermissionsQuery: jest.fn(),
}));

const mockUsePrivyBridge = usePrivyBridge as jest.Mock;
const mockUsePermissionsQuery = usePermissionsQuery as unknown as jest.Mock;

describe("PermissionProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PermissionProvider>{children}</PermissionProvider>
  );
  const previousE2EBypassFlag = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    delete (window as Window & { Cypress?: unknown }).Cypress;
    localStorage.removeItem("privy:auth_state");

    mockUsePrivyBridge.mockReturnValue({
      ready: false,
      authenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
      getAccessToken: jest.fn(),
      connectWallet: jest.fn(),
      wallets: [],
      smartWalletClient: null,
      isConnected: false,
    });

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
    delete (window as Window & { Cypress?: unknown }).Cypress;
    localStorage.removeItem("privy:auth_state");
  });

  it("enables permissions query for Cypress mock-authenticated sessions", () => {
    (window as Window & { Cypress?: unknown }).Cypress = {};
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

  it("does not enable permissions query for malformed cypress auth payloads", () => {
    (window as Window & { Cypress?: unknown }).Cypress = {};
    localStorage.setItem("privy:auth_state", "{bad-json");

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: false });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isGuestDueToError).toBe(false);
  });

  it("does not enable query when bypass flag is disabled", () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
    (window as Window & { Cypress?: unknown }).Cypress = {};
    localStorage.setItem("privy:auth_state", JSON.stringify({ authenticated: true }));

    const { result } = renderHook(() => usePermissionContext(), { wrapper });

    expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: false });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isGuestDueToError).toBe(false);
  });

  describe("Farcaster login (no browser-connectable wallet)", () => {
    /**
     * Farcaster users authenticate via Privy but have no browser-connectable wallet.
     * The permission query should still fire — wallet connectivity is orthogonal to RBAC.
     */
    it("enables permissions query when Privy is authenticated without wallet connection", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

      renderHook(() => usePermissionContext(), { wrapper });

      // Permissions query should be enabled for Farcaster users
      // even though no wallet is connected in the browser
      expect(mockUsePermissionsQuery).toHaveBeenCalledWith({}, { enabled: true });
    });

    it("loads permissions for Farcaster users without wallet connection", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

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
      expect(result.current.can(Permission.PROGRAM_VIEW)).toBe(true);
    });
  });

  describe("Wagmi initialization race condition", () => {
    it("reports isLoading=true when Privy is ready+authenticated but Wagmi is still connecting", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=true when Privy is ready+authenticated but Wagmi is reconnecting", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=false once Wagmi connects and permissions load", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: true,
      });

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

    it("reports isLoading=true when Privy is authenticated but Wagmi hasn't started yet", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("does not report loading for genuinely unauthenticated users", () => {
      mockUsePrivyBridge.mockReturnValue({
        ready: true,
        authenticated: false,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        getAccessToken: jest.fn(),
        connectWallet: jest.fn(),
        wallets: [],
        smartWalletClient: null,
        isConnected: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.roles.primaryRole).toBe(Role.GUEST);
    });
  });
});
