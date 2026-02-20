import { usePrivy } from "@privy-io/react-auth";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { PermissionProvider, usePermissionContext } from "../context/permission-context";
import { usePermissionsQuery } from "../hooks/use-permissions";
import { Permission } from "../types/permission";
import { Role } from "../types/role";

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));

jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}));

jest.mock("../hooks/use-permissions", () => ({
  usePermissionsQuery: jest.fn(),
}));

const mockUsePrivy = usePrivy as jest.Mock;
const mockUseAccount = useAccount as jest.Mock;
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

    mockUsePrivy.mockReturnValue({
      ready: false,
      authenticated: false,
    });

    mockUseAccount.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
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

  describe("Wagmi initialization race condition", () => {
    it("reports isLoading=true when Privy is ready+authenticated but Wagmi is still connecting", () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
      });

      mockUseAccount.mockReturnValue({
        isConnected: false,
        isConnecting: true,
        isReconnecting: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=true when Privy is ready+authenticated but Wagmi is reconnecting", () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
      });

      mockUseAccount.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isReconnecting: true,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("reports isLoading=false once Wagmi connects and permissions load", () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
      });

      mockUseAccount.mockReturnValue({
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
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
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
      });

      mockUseAccount.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isGuestDueToError).toBe(false);
    });

    it("does not report loading for genuinely unauthenticated users", () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: false,
      });

      mockUseAccount.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
      });

      const { result } = renderHook(() => usePermissionContext(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.roles.primaryRole).toBe(Role.GUEST);
    });
  });
});
