import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
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
    getPublicComments: vi.fn().mockResolvedValue([]),
    createPublicComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import type { ApplicationComment } from "../../types";
import { usePublicCommenting } from "../use-public-commenting";

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

const makeComment = (overrides: Partial<ApplicationComment> = {}): ApplicationComment => ({
  id: "comment-1",
  applicationId: "app-1",
  authorAddress: "0xAuthor",
  authorRole: "applicant",
  content: "Test comment",
  isDeleted: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("usePublicCommenting - canDeleteComment multi-wallet support", () => {
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

  it("allows deletion when compareAllWallets matches the comment author", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "ref-1",
          communityId: "comm-1",
        }),
      { wrapper }
    );

    const comment = makeComment({ authorAddress: "0xABC" });
    expect(result.current.canDeleteComment(comment)).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xABC");
  });

  it("allows Farcaster user to delete comment made with different linked wallet", () => {
    const user = makeFarcasterUser("0xLinked", "0xFarcasterOwner");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xLinked" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "ref-1",
          communityId: "comm-1",
        }),
      { wrapper }
    );

    // Comment was authored by the Farcaster owner address, not the linked wallet
    const comment = makeComment({ authorAddress: "0xFarcasterOwner" });
    expect(result.current.canDeleteComment(comment)).toBe(true);
    expect(mockCompareAllWallets).toHaveBeenCalledWith(user, "0xFarcasterOwner");
  });

  it("denies deletion when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      address: undefined,
      authenticated: false,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "ref-1",
          communityId: "comm-1",
        }),
      { wrapper }
    );

    const comment = makeComment({ authorAddress: "0xABC" });
    expect(result.current.canDeleteComment(comment)).toBe(false);
  });

  it("denies deletion for deleted comments", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "ref-1",
          communityId: "comm-1",
        }),
      { wrapper }
    );

    const comment = makeComment({ authorAddress: "0xABC", isDeleted: true });
    expect(result.current.canDeleteComment(comment)).toBe(false);
  });

  it("denies deletion when compareAllWallets returns false", () => {
    const user = makeUser("0xABC");
    mockUseAuth.mockReturnValue({
      user,
      address: "0xABC" as `0x${string}`,
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockCompareAllWallets.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "ref-1",
          communityId: "comm-1",
        }),
      { wrapper }
    );

    const comment = makeComment({ authorAddress: "0xOther" });
    expect(result.current.canDeleteComment(comment)).toBe(false);
  });
});
