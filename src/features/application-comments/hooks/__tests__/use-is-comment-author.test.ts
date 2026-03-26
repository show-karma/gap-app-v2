import { renderHook } from "@testing-library/react";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { useIsCommentAuthor } from "../use-is-comment-author";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCompareAllWallets = compareAllWallets as jest.MockedFunction<typeof compareAllWallets>;

const makeUser = (address = "0xABC") =>
  ({
    id: "user-1",
    linkedAccounts: [{ type: "wallet", address }],
  }) as unknown as ReturnType<typeof useAuth>["user"];

const makeFarcasterUser = (walletAddress: string, farcasterOwnerAddress: string) =>
  ({
    id: "user-farcaster",
    linkedAccounts: [
      { type: "wallet", address: walletAddress },
      {
        type: "farcaster",
        ownerAddress: farcasterOwnerAddress,
        fid: 12345,
        username: "testuser",
      },
    ],
  }) as unknown as ReturnType<typeof useAuth>["user"];

describe("useIsCommentAuthor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true when compareAllWallets matches the author address", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(() => useIsCommentAuthor("0xABC"));

    expect(result.current).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xABC");
  });

  it("returns true for Farcaster user with a different linked wallet as author", () => {
    const user = makeFarcasterUser("0xLinked", "0xFarcasterOwner");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(() => useIsCommentAuthor("0xFarcasterOwner"));

    expect(result.current).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xFarcasterOwner");
  });

  it("returns false when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useIsCommentAuthor("0xABC"));

    expect(result.current).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns false when authorAddress is empty", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useIsCommentAuthor(""));

    expect(result.current).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns false when compareAllWallets returns false", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(false);

    const { result } = renderHook(() => useIsCommentAuthor("0xDEF"));

    expect(result.current).toBe(false);
  });

  it("memoizes result when inputs are unchanged", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({ user } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { rerender } = renderHook(() => useIsCommentAuthor("0xABC"));
    rerender();

    expect(mockCompareAllWallets).toHaveBeenCalledTimes(1);
  });
});
