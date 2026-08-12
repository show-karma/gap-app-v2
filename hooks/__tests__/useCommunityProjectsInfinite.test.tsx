import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CommunityProject, CommunityProjects } from "@/types/v2/community";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";
import { useCommunityProjectsInfinite } from "../useCommunityProjectsInfinite";

/**
 * SSR seeding contract for the community project hubs (DEV-584). The server
 * already fetches the first page; the hook must accept it as `initialData` so
 * the very first render — including the server render — has the project
 * entities, while still revalidating on mount.
 */

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityProjects: vi.fn(),
}));

const mockGetCommunityProjects = vi.mocked(getCommunityProjects);

const makeProject = (uid: string): CommunityProject => ({
  uid,
  details: {
    title: `Project ${uid}`,
    description: `Description for ${uid}`,
    logoUrl: "",
    slug: `project-${uid}`,
  },
  categories: [],
  regions: [],
  grantNames: [],
  members: [],
  links: [],
  endorsements: [],
  contractAddresses: [],
  numMilestones: 0,
  numCompletedMilestones: 0,
  numUpdates: 0,
  percentCompleted: 0,
  numTransactions: 0,
  createdAt: "2025-01-01T00:00:00.000Z",
});

const makePage = (page: number, hasNextPage: boolean): CommunityProjects => ({
  payload: [makeProject(`p${page}-a`), makeProject(`p${page}-b`)],
  pagination: {
    totalCount: 24,
    page,
    limit: 12,
    totalPages: 2,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    hasNextPage,
    hasPrevPage: page > 1,
  },
});

const baseOptions = {
  communityId: "test-community",
  sortBy: "milestones" as const,
  categories: [] as string[],
  maturityStage: "all" as const,
  programId: null,
  trackIds: null,
};

describe("useCommunityProjectsInfinite", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    // Never resolves: keeps the mount revalidation permanently in flight so the
    // assertions describe the *first* render, not the post-fetch state.
    mockGetCommunityProjects.mockReturnValue(new Promise<CommunityProjects>(() => {}));
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("exposes the seeded page synchronously on the first render", () => {
    const seed = makePage(1, true);

    const { result } = renderHook(
      () =>
        useCommunityProjectsInfinite({
          ...baseOptions,
          initialData: { pages: [seed], pageParams: [1] },
        }),
      { wrapper }
    );

    expect(result.current.data?.pages[0]).toEqual(seed);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("stays pending on the first render without a seed (unseeded behavior is unchanged)", () => {
    const { result } = renderHook(() => useCommunityProjectsInfinite(baseOptions), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("revalidates the seeded page exactly once on mount", async () => {
    const seed = makePage(1, true);

    renderHook(
      () =>
        useCommunityProjectsInfinite({
          ...baseOptions,
          initialData: { pages: [seed], pageParams: [1] },
        }),
      { wrapper }
    );

    await waitFor(() => expect(mockGetCommunityProjects).toHaveBeenCalledTimes(1));
    expect(mockGetCommunityProjects).toHaveBeenCalledWith(
      "test-community",
      expect.objectContaining({ page: 1, limit: 12, sortBy: "milestones" })
    );
  });

  it("keeps a page-2 seed in its own cache entry and paginates onwards from it", async () => {
    const pageOne = makePage(1, true);
    const pageTwo = makePage(2, true);

    const { result: first } = renderHook(
      () =>
        useCommunityProjectsInfinite({
          ...baseOptions,
          initialData: { pages: [pageOne], pageParams: [1] },
        }),
      { wrapper }
    );
    const { result: second } = renderHook(
      () =>
        useCommunityProjectsInfinite({
          ...baseOptions,
          initialData: { pages: [pageTwo], pageParams: [2] },
          initialPage: 2,
        }),
      { wrapper }
    );

    // Distinct cache entries — a page-2 seed cannot overwrite the page-1 view.
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["community-projects-infinite"] })
    ).toHaveLength(2);
    expect(first.current.data?.pages[0].pagination.page).toBe(1);
    expect(second.current.data?.pages[0].pagination.page).toBe(2);

    mockGetCommunityProjects.mockClear();
    second.current.fetchNextPage();

    await waitFor(() => expect(mockGetCommunityProjects).toHaveBeenCalled());
    expect(mockGetCommunityProjects).toHaveBeenCalledWith(
      "test-community",
      expect.objectContaining({ page: 3 })
    );
  });
});
