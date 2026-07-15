import { isValidElement, type ReactElement, Suspense } from "react";
import { createMockProject } from "@/__tests__/factories/project.factory";
import Projects from "@/app/projects/page";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { PaginatedProjectsResponse } from "@/types/v2/project";

/**
 * SSR /projects orchestration (ADR 0001 + Vercel async-defer). The page awaits
 * and parses searchParams, renders the static shell immediately, and defers the
 * single indexer fetch into a Suspense child that seeds ProjectsExplorer. Since
 * an async server child cannot resume in a client render, the test invokes that
 * child directly to prove: exactly one service call with the effective request,
 * the exact seed/state props, and the rejection fallback (no seed).
 */

const { getExplorerProjectsPaginatedMock } = vi.hoisted(() => ({
  getExplorerProjectsPaginatedMock: vi.fn(),
}));

vi.mock("@/services/projects-explorer.service", () => ({
  getExplorerProjectsPaginated: getExplorerProjectsPaginatedMock,
}));

// The explorer is a heavy client component; stub the section exports so the
// deferred child yields an inspectable element without loading them.
vi.mock("@/components/Pages/Projects", () => ({
  ProjectsExplorer: () => null,
  ProjectsHeroSection: () => null,
  ProjectsLoading: () => null,
  ProjectsStatsSection: () => null,
}));

type SearchParams = Record<string, string | string[] | undefined>;

const runPage = async (params: SearchParams): Promise<ReactElement> => {
  const pageFn = Projects as unknown as (props: {
    searchParams: Promise<SearchParams>;
  }) => Promise<ReactElement>;
  return pageFn({ searchParams: Promise.resolve(params) });
};

// Locate the deferred loader element inside the page's Suspense boundary.
function findLoaderElement(page: ReactElement): ReactElement {
  const children = (page.props as { children?: unknown }).children;
  const list = Array.isArray(children) ? children : [children];
  const suspense = list.find(
    (child): child is ReactElement => isValidElement(child) && child.type === Suspense
  );
  if (!suspense) {
    throw new Error("Suspense boundary not found in /projects page");
  }
  return (suspense.props as { children: ReactElement }).children;
}

// Invoke the async server child (the only place data is fetched) and return the
// ProjectsExplorer element it renders.
async function resolveExplorer(page: ReactElement): Promise<ReactElement> {
  const loader = findLoaderElement(page);
  const loaderFn = loader.type as (props: unknown) => Promise<ReactElement>;
  return loaderFn(loader.props);
}

function buildResponse(): PaginatedProjectsResponse {
  return {
    payload: [createMockProject({ details: { title: "DAO Tooling", slug: "dao-tooling" } })],
    pagination: {
      totalCount: 120,
      page: 3,
      limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
      totalPages: 3,
      nextPage: null,
      prevPage: 2,
      hasNextPage: false,
      hasPrevPage: true,
    },
  };
}

describe("app/projects/page.tsx server orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits searchParams, fetches page 3 exactly once in the deferred child, and seeds the explorer", async () => {
    const response = buildResponse();
    getExplorerProjectsPaginatedMock.mockResolvedValueOnce(response);

    const page = await runPage({
      page: "3",
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: "true",
    });
    const explorer = await resolveExplorer(page);

    // Exactly one server-side fetch, with the effective first-page request.
    expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledTimes(1);
    expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledWith({
      search: "dao",
      page: 3,
      limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
      sortBy: "title",
      sortOrder: "asc",
      includeStats: true,
      hasPayoutAddress: true,
    });

    const props = explorer.props as Record<string, unknown>;
    expect(props.initialData).toEqual(response);
    expect(props.initialState).toEqual({
      page: 3,
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: true,
    });
  });

  it("resolves the child with no seed but the full state when the deferred fetch rejects", async () => {
    getExplorerProjectsPaginatedMock.mockRejectedValueOnce(new Error("indexer down"));

    const page = await runPage({ page: "1" });
    const explorer = await resolveExplorer(page);

    expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledTimes(1);
    const props = explorer.props as Record<string, unknown>;
    expect(props.initialData).toBeUndefined();
    expect(props.initialState).toEqual({
      page: 1,
      q: "",
      sortBy: "updatedAt",
      sortOrder: "desc",
      raisingFunds: false,
    });
  });
});
