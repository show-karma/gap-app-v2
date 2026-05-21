import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useGrantLinkedActivities } from "../useGrantLinkedActivities";

vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: vi.fn(),
}));

import { getProjectUpdates } from "@/services/project-updates.service";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";

const mockGetProjectUpdates = getProjectUpdates as vi.MockedFunction<typeof getProjectUpdates>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const wrap = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const GRANT_UID = "0xea21ef9e1c39915de09540a2be592076a4bca421f033cbb9a9f430084020d39c";
const OTHER_GRANT_UID = "0xdeadbeef";

const baseResponse: UpdatesApiResponse = {
  projectUpdates: [
    {
      uid: "0xUpdateLinked",
      recipient: "0x1",
      title: "Linked",
      description: "linked to grant",
      verified: false,
      startDate: null,
      endDate: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      associations: {
        funding: [{ uid: GRANT_UID, name: "Giv-Arb" }],
        indicators: [],
        deliverables: [],
      },
    },
    {
      uid: "0xUpdateUnlinked",
      recipient: "0x1",
      title: "Unlinked",
      description: "no grant",
      verified: false,
      startDate: null,
      endDate: null,
      createdAt: "2025-01-02T00:00:00.000Z",
      associations: { funding: [], indicators: [], deliverables: [] },
    },
    {
      uid: "0xUpdateOtherGrant",
      recipient: "0x1",
      title: "Other",
      description: "different grant",
      verified: false,
      startDate: null,
      endDate: null,
      createdAt: "2025-01-03T00:00:00.000Z",
      associations: {
        funding: [{ uid: OTHER_GRANT_UID, name: "Other" }],
        indicators: [],
        deliverables: [],
      },
    },
  ],
  projectMilestones: [],
  grantMilestones: [],
  grantUpdates: [],
};

describe("useGrantLinkedActivities", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should_return_only_activities_linked_to_the_given_grant", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce(baseResponse);

    const { result } = renderHook(() => useGrantLinkedActivities("project-slug", GRANT_UID), {
      wrapper: wrap(queryClient),
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].uid).toBe("0xUpdateLinked");
  });

  it("should_match_grant_uid_case_insensitively", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce(baseResponse);

    const { result } = renderHook(
      () => useGrantLinkedActivities("project-slug", GRANT_UID.toUpperCase()),
      { wrapper: wrap(queryClient) }
    );

    await waitFor(() => expect(result.current).toHaveLength(1));
  });

  it("should_return_empty_array_when_grant_uid_is_undefined", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce(baseResponse);

    const { result } = renderHook(() => useGrantLinkedActivities("project-slug", undefined), {
      wrapper: wrap(queryClient),
    });

    await waitFor(() => expect(mockGetProjectUpdates).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it("should_return_empty_array_when_no_updates_link_to_the_grant", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce(baseResponse);

    const { result } = renderHook(() => useGrantLinkedActivities("project-slug", "0xunused"), {
      wrapper: wrap(queryClient),
    });

    await waitFor(() => expect(mockGetProjectUpdates).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
