import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: vi.fn(),
}));

vi.mock("../../api/comments-service", () => ({
  CommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { useApplicationComments } from "../use-application-comments";

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
const mockCompareAllWallets = compareAllWallets as vi.MockedFunction<typeof compareAllWallets>;

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

describe("useApplicationComments - isOwner multi-wallet support", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("returns isOwner=true when ownerAddress matches via compareAllWallets", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useApplicationComments({
          applicationId: "app-1",
          ownerAddress: "0xABC",
        }),
      { wrapper }
    );

    expect(result.current.isOwner).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xABC");
  });

  it("returns isOwner=true for Farcaster user whose comment was made with a different linked wallet", () => {
    // User connected with wallet 0xLinked but comment was made with 0xFarcasterOwner
    const user = makeFarcasterUser("0xLinked", "0xFarcasterOwner");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xLinked" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useApplicationComments({
          applicationId: "app-1",
          ownerAddress: "0xFarcasterOwner",
        }),
      { wrapper }
    );

    expect(result.current.isOwner).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xFarcasterOwner");
  });

  it("returns isOwner=false when user is null", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      address: undefined,
      authenticated: false,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(
      () =>
        useApplicationComments({
          applicationId: "app-1",
          ownerAddress: "0xABC",
        }),
      { wrapper }
    );

    expect(result.current.isOwner).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns isOwner=false when ownerAddress is not provided", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(
      () =>
        useApplicationComments({
          applicationId: "app-1",
        }),
      { wrapper }
    );

    expect(result.current.isOwner).toBe(false);
    expect(mockCompareAllWallets).not.toHaveBeenCalled();
  });

  it("returns isOwner=false when compareAllWallets returns false", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useApplicationComments({
          applicationId: "app-1",
          ownerAddress: "0xDEF",
        }),
      { wrapper }
    );

    expect(result.current.isOwner).toBe(false);
  });
});
