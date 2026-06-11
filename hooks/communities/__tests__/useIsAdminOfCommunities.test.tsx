import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useIsAdminOfCommunities } from "../useIsAdminOfCommunities";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/utilities/eas-wagmi-utils", () => ({ useSigner: () => undefined }));
vi.mock("@/utilities/sdk/communities/isCommunityAdmin", () => ({ isAdminOfAnyCommunity: vi.fn() }));
vi.mock("@/utilities/auth/compare-all-wallets", () => ({ getLinkedWalletAddresses: () => [] }));

import { useAuth } from "@/hooks/useAuth";
import { isAdminOfAnyCommunity } from "@/utilities/sdk/communities/isCommunityAdmin";

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockIsAdminOfAnyCommunity = isAdminOfAnyCommunity as unknown as ReturnType<typeof vi.fn>;

const ADDRESS = "0x1111111111111111111111111111111111111111";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const wrap = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const renderTarget = (communityUIDs?: string[]) =>
  renderHook(() => useIsAdminOfCommunities(communityUIDs), {
    wrapper: wrap(createTestQueryClient()),
  });

describe("useIsAdminOfCommunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ authenticated: true, address: ADDRESS, user: null });
  });

  it("should_return_true_when_admin_of_any_community", async () => {
    mockIsAdminOfAnyCommunity.mockResolvedValue(true);

    const { result } = renderTarget(["0xcomm1", "0xcomm2"]);

    await waitFor(() => expect(result.current.isCommunityAdmin).toBe(true));
    expect(mockIsAdminOfAnyCommunity).toHaveBeenCalledWith(
      ["0xcomm1", "0xcomm2"],
      [ADDRESS],
      undefined
    );
  });

  it("should_return_false_when_admin_of_no_community", async () => {
    mockIsAdminOfAnyCommunity.mockResolvedValue(false);

    const { result } = renderTarget(["0xcomm1", "0xcomm2"]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCommunityAdmin).toBe(false);
  });

  it("should_not_check_admin_when_unauthenticated", async () => {
    mockUseAuth.mockReturnValue({ authenticated: false, address: undefined, user: null });

    const { result } = renderTarget(["0xcomm1"]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCommunityAdmin).toBe(false);
    expect(mockIsAdminOfAnyCommunity).not.toHaveBeenCalled();
  });

  it("should_not_check_admin_when_no_communities_provided", async () => {
    const { result } = renderTarget([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCommunityAdmin).toBe(false);
    expect(mockIsAdminOfAnyCommunity).not.toHaveBeenCalled();
  });
});
