import { isValidElement, type ReactElement, Suspense } from "react";
import { createMockProject } from "@/__tests__/factories/project.factory";
import Projects from "@/app/t/[tenant]/(chrome)/projects/page";
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

const { getExplorerProjectsPaginatedMock, errorManagerMock } = vi.hoisted(() => ({
  getExplorerProjectsPaginatedMock: vi.fn(),
  errorManagerMock: vi.fn(),
}));

vi.mock("@/services/projects-explorer.service", () => ({
  getExplorerProjectsPaginated: getExplorerProjectsPaginatedMock,
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: errorManagerMock,
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

// The page takes no props any more: reading `searchParams` at the top level of a
// crawlable route is runtime data and blocks the prerender under
// cacheComponents. `params` is still accepted here so the callers below read as
// before, and is deliberately ignored — that it has no effect is the point.
const runPage = async (_params: SearchParams = {}): Promise<ReactElement> => {
  const pageFn = Projects as unknown as () => ReactElement | Promise<ReactElement>;
  return pageFn();
};

/**
 * Locate the async loader element that owns the data fetch.
 *
 * It used to sit inside an in-page <Suspense>. That boundary was removed
 * (DEV-612): /projects ships in the sitemap, and the boundary streamed the
 * whole project list into a hidden chunk while the visible document showed a
 * skeleton — the same pattern the removed loading.tsx files caused. The loader
 * is now a direct child of the page, awaited inline.
 *
 * Asserting it is NOT wrapped in Suspense is part of the contract: putting a
 * boundary back here would re-hide the list from readers without JavaScript.
 */
function findLoaderElement(page: ReactElement): ReactElement {
  const children = (page.props as { children?: unknown }).children;
  const list = Array.isArray(children) ? children : [children];

  const suspense = list.find(
    (child): child is ReactElement => isValidElement(child) && child.type === Suspense
  );
  if (suspense) {
    throw new Error(
      "/projects wraps its list in <Suspense> again — that hides the project list from no-JS readers (DEV-612)"
    );
  }

  // Identify the loader by the prop only it receives — the sibling hero and
  // stats sections are function components too.
  const loader = list.find(
    (child): child is ReactElement =>
      isValidElement(child) &&
      typeof child.type === "function" &&
      "initialState" in ((child.props ?? {}) as Record<string, unknown>)
  );
  if (!loader) {
    throw new Error("Deferred loader element not found in /projects page");
  }
  return loader;
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

  it("ignores searchParams and seeds the explorer with the default, unfiltered list", async () => {
    const response = buildResponse();
    getExplorerProjectsPaginatedMock.mockResolvedValueOnce(response);

    // Filters in the URL must not change what the server renders: this route is
    // crawlable, so it prerenders the default list and the client swaps in the
    // filtered one after hydration.
    const page = await runPage({
      page: "3",
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: "true",
    });
    const explorer = await resolveExplorer(page);

    expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledTimes(1);
    expect(getExplorerProjectsPaginatedMock).toHaveBeenCalledWith({
      search: "",
      page: 1,
      limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
      sortBy: "updatedAt",
      sortOrder: "desc",
      includeStats: true,
      hasPayoutAddress: false,
    });

    const props = explorer.props as Record<string, unknown>;
    expect(props.initialData).toEqual(response);
    expect(props.initialState).toEqual({
      page: 1,
      q: "",
      sortBy: "updatedAt",
      sortOrder: "desc",
      raisingFunds: false,
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

  it("reports the seed fetch failure via errorManager without leaking the query/user data", async () => {
    const failure = new Error("indexer down");
    getExplorerProjectsPaginatedMock.mockRejectedValueOnce(failure);

    const page = await runPage({ q: "confidential search term", page: "2" });
    await resolveExplorer(page);

    expect(errorManagerMock).toHaveBeenCalledTimes(1);
    const [message, error, extra] = errorManagerMock.mock.calls[0];
    expect(typeof message).toBe("string");
    expect(error).toBe(failure);
    // The observability payload must not carry the user's query or request state.
    const serializedExtra = JSON.stringify(extra ?? {});
    expect(serializedExtra).not.toContain("confidential search term");
    expect(extra).not.toHaveProperty("search");
    expect(extra).not.toHaveProperty("q");
    expect(extra).not.toHaveProperty("page");
  });

  it("does not call errorManager when the seed fetch succeeds", async () => {
    getExplorerProjectsPaginatedMock.mockResolvedValueOnce(buildResponse());

    const page = await runPage({
      page: "3",
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: "true",
    });
    await resolveExplorer(page);

    expect(errorManagerMock).not.toHaveBeenCalled();
  });
});
