import { renderHook, waitFor } from "@testing-library/react";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetToken = vi.fn();
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: () => mockGetToken() },
}));

import { useTokenReady } from "@/hooks/useTokenReady";

describe("useTokenReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays false while unauthenticated and never polls for a token", () => {
    mockUseAuth.mockReturnValue({ authenticated: false, ready: true });
    const { result } = renderHook(() => useTokenReady());

    expect(result.current).toBe(false);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("becomes true once a real token resolves", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true, ready: true });
    mockGetToken.mockResolvedValue("jwt-token");

    const { result } = renderHook(() => useTokenReady());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("drops back to false on a settled logout", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true, ready: true });
    mockGetToken.mockResolvedValue("jwt-token");

    const { result, rerender } = renderHook(() => useTokenReady());
    await waitFor(() => expect(result.current).toBe(true));

    mockUseAuth.mockReturnValue({ authenticated: false, ready: true });
    rerender();

    await waitFor(() => expect(result.current).toBe(false));
  });
});
