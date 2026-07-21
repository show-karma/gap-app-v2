import { screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { createMockProject } from "@/__tests__/factories/project.factory";
import { renderWithProviders } from "@/__tests__/utils/render";
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import type { PaginatedProjectsResponse } from "@/types/v2/project";

/**
 * ProjectsExplorer SSR seeding + crawlable pagination (ADR 0001). Pins the
 * optional seed/state props the component accepts: when the live URL state
 * matches initialState the component seeds the hook with InfiniteData
 * {pages:[response]} + initialPage and renders the SSR cards synchronously as
 * ordinary /project/<slug> anchors, plus visible Previous/Next Next.js links
 * (with preserved filters and #browse-projects) derived from pagination
 * metadata, while keeping Load More as progressive enhancement. A URL filter
 * change away from initialState drops the seed so a page-3 payload cannot bleed
 * into another query.
 */

interface InfiniteSeed {
  pages: PaginatedProjectsResponse[];
  pageParams: number[];
}

interface HookOptions {
  search?: string;
  sortBy?: ExplorerSortByOptions;
  sortOrder?: ExplorerSortOrder;
  hasPayoutAddress?: boolean;
  initialData?: InfiniteSeed;
  initialPage?: number;
}

const { useProjectsExplorerInfiniteMock } = vi.hoisted(() => ({
  useProjectsExplorerInfiniteMock: vi.fn(),
}));

// The hook derives its output from the InfiniteData seed handed to it, so the
// component's seeding decision is what drives the rendered projects/pagination.
vi.mock("@/hooks/useProjectsExplorerInfinite", () => ({
  useProjectsExplorerInfinite: useProjectsExplorerInfiniteMock,
}));

// nuqs query state backed by a mutable URL-state map the test can mutate.
const urlState = new Map<string, string>();
vi.mock("nuqs", () => ({
  useQueryState: (key: string, options?: { defaultValue?: string }) => {
    const value = urlState.get(key) ?? options?.defaultValue ?? "";
    const setValue = (next: string | null) => {
      if (next === null) {
        urlState.delete(key);
      } else {
        urlState.set(key, next);
      }
      return Promise.resolve(new URLSearchParams());
    };
    return [value, setValue];
  },
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <span data-testid="markdown-preview">{source}</span>
  ),
}));

vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => (
    <span data-testid={`profile-pic-${name}`}>{name}</span>
  ),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: { removeQueries: vi.fn() },
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

type ExplorerState = {
  page: number;
  q: string;
  sortBy: ExplorerSortByOptions;
  sortOrder: ExplorerSortOrder;
  raisingFunds: boolean;
};

interface ExplorerProps {
  initialData?: PaginatedProjectsResponse;
  initialState?: ExplorerState;
}

// The production component does not yet accept props — bridge to the seeded
// signature this slice pins.
const Explorer = ProjectsExplorer as unknown as ComponentType<ExplorerProps>;

const FILTER_STATE = {
  q: "dao",
  sortBy: "title" as ExplorerSortByOptions,
  sortOrder: "asc" as ExplorerSortOrder,
  raisingFunds: true,
};

const FILTERED_QUERY = "q=dao&sortBy=title&sortOrder=asc&raisingFunds=true";

function stateFor(page: number): ExplorerState {
  return { page, ...FILTER_STATE };
}

function buildResponse(options: {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}): PaginatedProjectsResponse {
  const { page, totalPages, hasNextPage } = options;
  return {
    payload: [
      createMockProject({ details: { title: "DAO Tooling", slug: "dao-tooling" } }),
      createMockProject({ details: { title: "DAO Ops", slug: "dao-ops" } }),
    ],
    pagination: {
      totalCount: 250,
      page,
      limit: 50,
      totalPages,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage,
      hasPrevPage: page > 1,
    },
  };
}

function setMatchingUrl() {
  urlState.set("q", "dao");
  urlState.set("sortBy", "title");
  urlState.set("sortOrder", "asc");
  urlState.set("raisingFunds", "true");
}

function lastHookOptions(): HookOptions {
  return useProjectsExplorerInfiniteMock.mock.calls.at(-1)?.[0] as HookOptions;
}

beforeEach(() => {
  urlState.clear();
  vi.clearAllMocks();
  useProjectsExplorerInfiniteMock.mockImplementation((options: HookOptions) => {
    const pages = options.initialData?.pages ?? [];
    const projects = pages.flatMap((page) => page.payload);
    const firstPage = pages[0];
    const lastPage = pages[pages.length - 1];
    return {
      projects,
      totalCount: firstPage?.pagination.totalCount ?? 0,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      isError: false,
      error: null,
      hasNextPage: lastPage?.pagination.hasNextPage ?? false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    };
  });
});

describe("ProjectsExplorer SSR seeding and crawlable pagination", () => {
  it("seeds the hook and renders SSR cards plus filtered Previous/Next links for a matching page-3 state", () => {
    setMatchingUrl();
    const response = buildResponse({ page: 3, totalPages: 5, hasNextPage: true });

    renderWithProviders(<Explorer initialData={response} initialState={stateFor(3)} />);

    // Seeded the hook with wrapped InfiniteData and the start page.
    const options = lastHookOptions();
    expect(options.initialData).toEqual({ pages: [response], pageParams: [3] });
    expect(options.initialPage).toBe(3);

    // SSR cards render synchronously as ordinary project anchors.
    const toolingLink = screen.getByRole("link", { name: /view dao tooling project details/i });
    expect(toolingLink).toHaveAttribute("href", "/project/dao-tooling");
    const opsLink = screen.getByRole("link", { name: /view dao ops project details/i });
    expect(opsLink).toHaveAttribute("href", "/project/dao-ops");

    // Crawlable Previous/Next preserve the effective filters and the anchor.
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      `/projects?${FILTERED_QUERY}&page=2#browse-projects`
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      `/projects?${FILTERED_QUERY}&page=4#browse-projects`
    );
  });

  it("omits Previous on page 1 and keeps Load More when more pages exist", () => {
    setMatchingUrl();
    const response = buildResponse({ page: 1, totalPages: 5, hasNextPage: true });

    renderWithProviders(<Explorer initialData={response} initialState={stateFor(1)} />);

    expect(screen.queryByRole("link", { name: /previous/i })).toBeNull();
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      `/projects?${FILTERED_QUERY}&page=2#browse-projects`
    );
    // Progressive enhancement: the Load More control stays.
    expect(screen.getByRole("button", { name: /load more projects/i })).toBeInTheDocument();
  });

  it("omits Next on the final page while keeping Previous", () => {
    setMatchingUrl();
    const response = buildResponse({ page: 5, totalPages: 5, hasNextPage: false });

    renderWithProviders(<Explorer initialData={response} initialState={stateFor(5)} />);

    expect(screen.queryByRole("link", { name: /next/i })).toBeNull();
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      `/projects?${FILTERED_QUERY}&page=4#browse-projects`
    );
  });

  it("normalizes an invalid URL sort so neither the service nor the Select label sees it", () => {
    urlState.set("sortBy", "not-a-sort");

    renderWithProviders(<Explorer />);

    // The service receives the normalized fallback, never the raw invalid value.
    expect(lastHookOptions().sortBy).toBe("updatedAt");
    // The Select shows the normalized label rather than an undefined value.
    expect(screen.getByRole("combobox", { name: /sort projects by/i })).toHaveTextContent(
      "Recently Updated"
    );
  });

  it("drops the seed when the URL filter state changes away from initialState", () => {
    setMatchingUrl();
    const response = buildResponse({ page: 3, totalPages: 5, hasNextPage: true });

    const { rerender } = renderWithProviders(
      <Explorer initialData={response} initialState={stateFor(3)} />
    );

    // URL query moves away from the seeded state.
    urlState.set("q", "governance");
    rerender(<Explorer initialData={response} initialState={stateFor(3)} />);

    const options = lastHookOptions();
    expect(options.initialData).toBeUndefined();
    expect(options.initialPage).toBe(1);
  });
});
