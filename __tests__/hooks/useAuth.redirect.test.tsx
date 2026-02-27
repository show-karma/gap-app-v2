import { usePrivy, useWallets } from "@privy-io/react-auth";
import { act, renderHook, waitFor } from "@testing-library/react";
import { watchAccount } from "@wagmi/core";
import * as nextNavigation from "next/navigation";
import { useAccount } from "wagmi";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUsePrivy = usePrivy as jest.Mock;
const mockUseWallets = useWallets as jest.Mock;
const mockUseAccount = useAccount as jest.Mock;
const mockWatchAccount = watchAccount as jest.Mock;
const mockUseRouter = jest.spyOn(nextNavigation, "useRouter");
const mockUsePathname = jest.spyOn(nextNavigation, "usePathname");

let privyState = {
  ready: true,
  authenticated: false,
  user: { id: "user-1" },
  login: jest.fn(),
  logout: jest.fn(),
  getAccessToken: jest.fn(),
  connectWallet: jest.fn(),
};

const { useAuth } = jest.requireActual("@/hooks/useAuth") as typeof import("@/hooks/useAuth");

jest.mock("@/utilities/auth/cypress-auth", () => ({
  getCypressMockAuthState: () => null,
}));

jest.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    setPrivyInstance: jest.fn(),
    getToken: jest.fn().mockResolvedValue("token"),
    clearCache: jest.fn(),
  },
}));

jest.mock("@/utilities/query-client", () => ({
  queryClient: { clear: jest.fn() },
}));

describe("useAuth post-login redirect", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUsePrivy.mockImplementation(() => privyState);
    mockUseWallets.mockReturnValue({ wallets: [] });
    mockUseAccount.mockReturnValue({ isConnected: true });
    mockWatchAccount.mockReturnValue(() => {});
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: jest.fn(),
      back: jest.fn(),
    } as any);
    mockUsePathname.mockReturnValue("/");

    privyState = {
      ...privyState,
      authenticated: false,
    };
    sessionStorage.clear();
  });

  it("redirects to /dashboard after login when on home page", async () => {
    const { rerender, result } = renderHook(() => useAuth());

    privyState = {
      ...privyState,
      authenticated: true,
    };

    await act(async () => {
      rerender();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
