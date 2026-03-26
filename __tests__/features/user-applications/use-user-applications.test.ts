import { useQuery, useQueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useUserApplications } from "@/src/features/user-applications/hooks/use-user-applications";
import { useUserApplicationsStore } from "@/src/features/user-applications/lib/store";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => ({
    prefetchQuery: jest.fn(),
  })),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockUseQuery = useQuery as unknown as jest.Mock;

describe("useUserApplications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    // Reset the zustand store between tests
    useUserApplicationsStore.getState().reset();
  });

  it("should enable the query when user has a wallet address", () => {
    mockUseAuth.mockReturnValue({
      address: "0x1234567890123456789012345678901234567890",
      authenticated: true,
      ready: true,
    });

    renderHook(() => useUserApplications());

    const queryOptions = mockUseQuery.mock.calls[0][0];
    expect(queryOptions.enabled).toBe(true);
  });

  it("should enable the query for Farcaster users with no wallet address", () => {
    // Farcaster users are authenticated but have no browser-connectable wallet
    mockUseAuth.mockReturnValue({
      address: undefined,
      authenticated: true,
      ready: true,
      user: {
        id: "did:privy:farcaster-user-123",
        farcaster: {
          fid: 12345,
          username: "testfcuser",
          displayName: "Test FC User",
          pfp: "https://example.com/fc-avatar.png",
        },
      },
    });

    renderHook(() => useUserApplications());

    const queryOptions = mockUseQuery.mock.calls[0][0];
    // BUG: Currently `enabled: !!address` evaluates to false for Farcaster users.
    // The API uses JWT auth (TokenManager.getToken()), NOT wallet address,
    // so the query should be enabled for any authenticated user.
    expect(queryOptions.enabled).toBe(true);
  });

  it("should NOT enable the query when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      address: undefined,
      authenticated: false,
      ready: true,
    });

    renderHook(() => useUserApplications());

    const queryOptions = mockUseQuery.mock.calls[0][0];
    expect(queryOptions.enabled).toBe(false);
  });
});
