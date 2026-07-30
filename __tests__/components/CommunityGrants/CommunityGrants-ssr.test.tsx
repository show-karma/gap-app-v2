import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { CommunityGrants } from "@/components/CommunityGrants";
import type { CommunityProject, CommunityProjects } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { getCommunityProjects } from "@/utilities/queries/v2/getCommunityData";

/**
 * DEV-584 acceptance: a crawler (or a JavaScript-disabled fetch) must receive the
 * server-fetched project entities in the initial HTML. These tests render the
 * component through `renderToString` — no effects, no client fetch, exactly what
 * a bot sees — with the REAL `useCommunityProjectsInfinite` hook, so the seeding
 * decision and the `isFilterLoading` gate are both exercised for real.
 */

const COMMUNITY_ID = "test-community";
const BASE_PATH = PAGES.COMMUNITY.ALL_GRANTS(COMMUNITY_ID);

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityProjects: vi.fn(),
}));

const mockGetCommunityProjects = vi.mocked(getCommunityProjects);

// nuqs query state backed by a mutable URL-state map the test can mutate, so the
// "filters are at their defaults" decision can be flipped per test.
const urlState = new Map<string, string>();
vi.mock("nuqs", () => ({
  useQueryState: <T,>(
    key: string,
    options?: { defaultValue?: T; parse?: (value: string) => T | null }
  ) => {
    const raw = urlState.get(key);
    const parsed = raw !== undefined && options?.parse ? options.parse(raw) : null;
    const value = parsed ?? options?.defaultValue ?? null;
    const setValue = (next: T | null) => {
      if (next === null) {
        urlState.delete(key);
      } else {
        urlState.set(key, String(next));
      }
      return Promise.resolve(new URLSearchParams());
    };
    return [value, setValue];
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: COMMUNITY_ID }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => BASE_PATH,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    alt = "",
    ...props
  }: ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => (
    <img {...props} alt={alt} />
  ),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => <span>{source}</span>,
}));

// Filter chrome is not part of the SSR entity contract — stub it so the test
// pins the seeding path rather than the dropdowns.
vi.mock("@/components/CommunityGrants/CategoryFilter", () => ({
  CategoryFilter: () => <div data-testid="category-filter" />,
}));
vi.mock("@/components/CommunityGrants/SortFilter", () => ({
  SortFilter: () => <div data-testid="sort-filter" />,
}));
vi.mock("@/components/CommunityGrants/MaturityStageFilter", () => ({
  MaturityStageFilter: () => <div data-testid="maturity-filter" />,
}));
vi.mock("@/components/Pages/Communities/Impact/ProgramFilter", () => ({
  ProgramFilter: () => <div data-testid="program-filter" />,
}));
vi.mock("@/components/Pages/Communities/Impact/TrackFilter", () => ({
  TrackFilter: () => <div data-testid="track-filter" />,
}));
vi.mock("@/components/ProgramBanner", () => ({
  ProgramBanner: () => <div data-testid="program-banner" />,
}));

const makeProject = (index: number): CommunityProject => ({
  uid: `0xproject${index}`,
  details: {
    title: `Seeded Project ${index}`,
    description: `Description for project ${index}`,
    logoUrl: "",
    slug: `seeded-project-${index}`,
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

const makeServerPage = (
  options: { page?: number; totalPages?: number; count?: number } = {}
): CommunityProjects => {
  const { page = 1, totalPages = 3, count = 12 } = options;
  const hasNextPage = page < totalPages;
  return {
    payload: Array.from({ length: count }, (_, index) => makeProject(index + 1)),
    pagination: {
      totalCount: totalPages * 12,
      page,
      limit: 12,
      totalPages,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage,
      hasPrevPage: page > 1,
    },
  };
};

const defaultProps = {
  categoriesOptions: ["DeFi", "Infrastructure"],
  defaultSelectedCategories: [] as string[],
  defaultSortBy: "milestones" as const,
  defaultSelectedMaturityStage: "all" as const,
  communityUid: "0xcommunity",
  paginationBasePath: BASE_PATH,
};

/** Render exactly what the server emits: no effects, no client fetch. */
const renderServerHtml = (ui: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  urlState.clear();
  vi.clearAllMocks();
  // Never resolves: the mount revalidation stays in flight, which is precisely
  // the state that used to blank the grid to a skeleton.
  mockGetCommunityProjects.mockReturnValue(new Promise<CommunityProjects>(() => {}));
});

describe("CommunityGrants server-rendered project entities", () => {
  it("emits all 12 server-fetched project names in the initial HTML", () => {
    const initialProjects = makeServerPage();

    const html = renderServerHtml(
      <CommunityGrants {...defaultProps} initialProjects={initialProjects} />
    );

    for (const project of initialProjects.payload) {
      expect(html).toContain(project.details.title);
      expect(html).toContain(`/project/${project.details.slug}`);
    }
    expect(html).not.toContain("project-block-skeleton");
  });

  it("keeps the seeded projects visible while the mount revalidation is in flight", async () => {
    const initialProjects = makeServerPage();

    renderWithProviders(<CommunityGrants {...defaultProps} initialProjects={initialProjects} />);

    // Synchronously present — no waitFor, no skeleton flash.
    expect(screen.getAllByTestId("project-block")).toHaveLength(12);
    expect(screen.queryAllByTestId("project-block-skeleton")).toHaveLength(0);

    await waitFor(() => expect(mockGetCommunityProjects).toHaveBeenCalled());
  });

  it("server-renders a crawlable next link when more pages exist", () => {
    const html = renderServerHtml(
      <CommunityGrants {...defaultProps} initialProjects={makeServerPage({ page: 1 })} />
    );

    expect(html).toContain(`href="${BASE_PATH}?page=2"`);
    expect(html).toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
  });

  it("server-renders both crawlable links from a deep page", () => {
    const html = renderServerHtml(
      <CommunityGrants
        {...defaultProps}
        initialProjects={makeServerPage({ page: 2 })}
        initialPage={2}
      />
    );

    expect(html).toContain(`href="${BASE_PATH}"`);
    expect(html).toContain('rel="prev"');
    expect(html).toContain(`href="${BASE_PATH}?page=3"`);
    expect(html).toContain('rel="next"');
  });

  it("omits crawlable pagination on a single-page community", () => {
    const html = renderServerHtml(
      <CommunityGrants
        {...defaultProps}
        initialProjects={makeServerPage({ page: 1, totalPages: 1 })}
      />
    );

    expect(html).not.toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
  });

  it("drops the seed when the URL carries a non-default filter", () => {
    urlState.set("categories", "DeFi");

    const html = renderServerHtml(
      <CommunityGrants {...defaultProps} initialProjects={makeServerPage()} />
    );

    expect(html).not.toContain("Seeded Project 1");
    expect(html).toContain("project-block-skeleton");
  });

  it("does not seed an empty server payload (a swallowed fetch error stays a skeleton)", () => {
    const html = renderServerHtml(
      <CommunityGrants
        {...defaultProps}
        initialProjects={{
          payload: [],
          pagination: {
            totalCount: 0,
            page: 1,
            limit: 12,
            totalPages: 0,
            nextPage: null,
            prevPage: null,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }}
      />
    );

    expect(html).toContain("project-block-skeleton");
    expect(html).not.toContain("No projects found");
  });

  it("renders the empty state once the query resolves with no projects", async () => {
    mockGetCommunityProjects.mockResolvedValue({
      payload: [],
      pagination: {
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });

    renderWithProviders(
      <CommunityGrants
        {...defaultProps}
        initialProjects={{
          payload: [],
          pagination: {
            totalCount: 0,
            page: 1,
            limit: 12,
            totalPages: 0,
            nextPage: null,
            prevPage: null,
            hasNextPage: false,
            hasPrevPage: false,
          },
        }}
      />
    );

    expect(await screen.findByText("No projects found")).toBeInTheDocument();
  });
});
