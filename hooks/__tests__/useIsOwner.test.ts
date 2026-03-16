import { renderHook } from "@testing-library/react";
import { useIsOwner } from "../useIsOwner";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCompareAllWallets = compareAllWallets as jest.MockedFunction<typeof compareAllWallets>;

const makeUser = (address = "0xABC") =>
  ({
    id: "user-1",
    linkedAccounts: [{ type: "wallet", address }],
  }) as unknown as ReturnType<typeof useAuth>["user"];

describe("useIsOwner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when user is null (Privy not ready)", () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useIsOwner("0xABC"));

    expect(result.current).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns false when ownerAddress is empty", () => {
    mockUseAuth.mockReturnValue({ user: makeUser() } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(() => useIsOwner(""));

    expect(result.current).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns true when compareAllWallets returns true", () => {
    mockUseAuth.mockReturnValue({ user: makeUser("0xABC") } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(() => useIsOwner("0xABC"));

    expect(result.current).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalled();
  });

  it("returns false when wallet addresses don't match", () => {
    mockUseAuth.mockReturnValue({ user: makeUser("0xABC") } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(false);

    const { result } = renderHook(() => useIsOwner("0xDEF"));

    expect(result.current).toBe(false);
  });

  it("passes user and ownerAddress to compareAllWallets", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    renderHook(() => useIsOwner("0xOwner123"));

    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xOwner123");
  });

  it("handles cross_app wallets via compareAllWallets", () => {
    const user = {
      id: "user-cross",
      linkedAccounts: [
        {
          type: "cross_app",
          embeddedWallets: [{ address: "0xEmbedded" }],
          smartWallets: [],
        },
      ],
    } as unknown as ReturnType<typeof useAuth>["user"];

    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(() => useIsOwner("0xEmbedded"));

    expect(result.current).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xEmbedded");
  });

  it("memoizes result — does not recompute when inputs are unchanged", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { rerender } = renderHook(() => useIsOwner("0xABC"));

    rerender();

    // useMemo should prevent redundant calls on same inputs
    expect(mockCompareAllWallets).toHaveBeenCalledTimes(1);
  });
});
