import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockFetchData = fetchData as unknown as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useDashboardAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ authenticated: true, address: "0x123" });
  });

  it("returns communities with metrics", async () => {
    const communities: Community[] = [
      {
        uid: "0xcommunity1" as `0x${string}`,
        chainID: 10,
        details: { name: "Optimism", slug: "optimism", imageURL: "logo.png" },
      },
      {
        uid: "0xcommunity2" as `0x${string}`,
        chainID: 1,
        details: { name: "Ethereum", slug: "ethereum", imageURL: "eth.png" },
      },
    ];

    mockFetchData
      .mockResolvedValueOnce([{ communities }, null, null, 200])
      .mockResolvedValueOnce([
        {
          communityUID: "0xcommunity1",
          totalPrograms: 4,
          enabledPrograms: 2,
          totalApplications: 10,
          approvedApplications: 2,
          rejectedApplications: 1,
          pendingApplications: 7,
          revisionRequestedApplications: 0,
          underReviewApplications: 0,
        },
        null,
        null,
        200,
      ])
      .mockResolvedValueOnce([
        {
          communityUID: "0xcommunity2",
          totalPrograms: 3,
          enabledPrograms: 0,
          totalApplications: 5,
          approvedApplications: 1,
          rejectedApplications: 1,
          pendingApplications: 3,
          revisionRequestedApplications: 0,
          underReviewApplications: 0,
        },
        null,
        null,
        200,
      ]);

    const { result } = renderHook(() => useDashboardAdmin(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.communities.length).toBe(2);
    });

    expect(result.current.communities[0]).toMatchObject({
      name: "Optimism",
      slug: "optimism",
      activeProgramsCount: 2,
      pendingApplicationsCount: 7,
      manageUrl: "/community/optimism/manage",
    });

    expect(result.current.communities[1]).toMatchObject({
      name: "Ethereum",
      slug: "ethereum",
      activeProgramsCount: 0,
      pendingApplicationsCount: 3,
      manageUrl: "/community/ethereum/manage",
    });
  });

  it("deduplicates communities on multiple chains by slug and aggregates metrics", async () => {
    const communities: Community[] = [
      {
        uid: "0xfilecoin-op" as `0x${string}`,
        chainID: 10,
        details: { name: "Filecoin", slug: "filecoin", imageURL: "fil.png" },
      },
      {
        uid: "0xfilecoin-arb" as `0x${string}`,
        chainID: 42161,
        details: { name: "Filecoin", slug: "filecoin", imageURL: "fil.png" },
      },
    ];

    mockFetchData
      .mockResolvedValueOnce([{ communities }, null, null, 200])
      .mockResolvedValueOnce([
        {
          communityUID: "0xfilecoin-op",
          totalPrograms: 2,
          enabledPrograms: 1,
          totalApplications: 5,
          approvedApplications: 1,
          rejectedApplications: 0,
          pendingApplications: 4,
          revisionRequestedApplications: 0,
          underReviewApplications: 0,
        },
        null,
        null,
        200,
      ])
      .mockResolvedValueOnce([
        {
          communityUID: "0xfilecoin-arb",
          totalPrograms: 3,
          enabledPrograms: 2,
          totalApplications: 8,
          approvedApplications: 2,
          rejectedApplications: 1,
          pendingApplications: 5,
          revisionRequestedApplications: 0,
          underReviewApplications: 0,
        },
        null,
        null,
        200,
      ]);

    const { result } = renderHook(() => useDashboardAdmin(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.communities.length).toBe(1);
    });

    expect(result.current.communities[0]).toMatchObject({
      name: "Filecoin",
      slug: "filecoin",
      activeProgramsCount: 3,
      pendingApplicationsCount: 9,
      manageUrl: "/community/filecoin/manage",
    });
  });
});
