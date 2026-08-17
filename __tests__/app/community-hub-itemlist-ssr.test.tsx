/**
 * DEV-596 acceptance for the community hub (`/community/[communityId]`):
 * the page emits an ItemList JSON-LD describing exactly the project entities
 * its server HTML renders — the seeded page, in rendered order — and nothing
 * when the server ships a skeleton instead (filtered URLs, empty payloads).
 *
 * Rendering goes through `renderToString`: no effects, no client fetch —
 * exactly what a crawler or a JavaScript-disabled reader receives.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import type { CommunityProject, CommunityProjects } from "@/types/v2/community";
import {
  getCommunityCategories,
  getCommunityDetails,
  getCommunityProjects,
} from "@/utilities/queries/v2/getCommunityData";

const COMMUNITY_ID = "test-community";

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: vi.fn(),
  getCommunityCategories: vi.fn(),
  getCommunityProjects: vi.fn(),
}));

const mockGetCommunityDetails = vi.mocked(getCommunityDetails);
const mockGetCommunityCategories = vi.mocked(getCommunityCategories);
const mockGetCommunityProjects = vi.mocked(getCommunityProjects);

// nuqs query state backed by a mutable URL-state map, mirroring the
// CommunityGrants SSR test, so the filter-in-URL branch can be exercised.
const urlState = new Map<string, string>();
vi.mock("nuqs", () => ({
  useQueryState: <T,>(
    key: string,
    options?: { defaultValue?: T; parse?: (value: string) => T | null }
  ) => {
    const raw = urlState.get(key);
    const parsed = raw !== undefined && options?.parse ? options.parse(raw) : null;
    const value = parsed ?? options?.defaultValue ?? null;
    const setValue = () => Promise.resolve(new URLSearchParams());
    return [value, setValue];
  },
}));

// The page reads the request host to decide whether it is serving a whitelabel
// tenant, and these tests render it outside a Next request scope. Answer with
// the canonical host so the assertions below describe the Karma-branded case.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "www.karmahq.org" }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: COMMUNITY_ID }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => `/community/${COMMUNITY_ID}`,
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
// pins the JSON-LD contract rather than the dropdowns.
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

const makeServerPage = (count = 3): CommunityProjects => ({
  payload: Array.from({ length: count }, (_, index) => makeProject(index + 1)),
  pagination: {
    totalCount: count,
    page: 1,
    limit: 12,
    totalPages: 1,
    nextPage: null,
    prevPage: null,
    hasNextPage: false,
    hasPrevPage: false,
  },
});

async function renderPageToHtml(
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<string> {
  const { default: Page } = await import("@/app/community/[communityId]/(with-header)/page");
  const ui = await Page({
    params: Promise.resolve({ communityId: COMMUNITY_ID }),
    searchParams: Promise.resolve(searchParams),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Parse every JSON-LD script the page emitted. */
function extractJsonLd(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1])
  );
}

type ListItem = { "@type": string; position: number; name: string; url: string };

beforeEach(() => {
  urlState.clear();
  vi.clearAllMocks();
  mockGetCommunityDetails.mockResolvedValue({
    uid: "0xcommunity",
    details: { name: "Test Community", slug: COMMUNITY_ID },
  } as Awaited<ReturnType<typeof getCommunityDetails>>);
  mockGetCommunityCategories.mockResolvedValue([]);
  mockGetCommunityProjects.mockResolvedValue(makeServerPage());
});

describe("community hub — ItemList JSON-LD (DEV-596)", () => {
  it("emits an ItemList whose every entry is backed by the rendered HTML", async () => {
    const html = await renderPageToHtml();
    const itemList = extractJsonLd(html).find((schema) => schema["@type"] === "ItemList") as
      | { numberOfItems: number; itemListElement: ListItem[] }
      | undefined;

    expect(itemList).toBeDefined();
    expect(itemList?.numberOfItems).toBe(3);

    // Every structured fact must be traceable to the visible server HTML —
    // JSON-LD claiming content the page does not render is the E3 defect
    // class this program fixed. Names appear as project card titles, urls as
    // the cards' anchors.
    for (const item of itemList?.itemListElement ?? []) {
      expect(html).toContain(item.name);
      const path = new URL(item.url).pathname;
      expect(html).toContain(`href="${path}"`);
    }
  });

  it("lists the projects in rendered order", async () => {
    const html = await renderPageToHtml();
    const itemList = extractJsonLd(html).find((schema) => schema["@type"] === "ItemList") as
      | { itemListElement: ListItem[] }
      | undefined;

    expect(itemList?.itemListElement.map((item) => item.name)).toEqual([
      "Seeded Project 1",
      "Seeded Project 2",
      "Seeded Project 3",
    ]);
    expect(itemList?.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("ships no ItemList when the URL carries a filter (the server renders a skeleton)", async () => {
    urlState.set("categories", "DeFi");

    const html = await renderPageToHtml({ categories: "DeFi" });

    // The filtered view is fetched client-side; the unfiltered server payload
    // is neither rendered nor claimed.
    expect(html).not.toContain("Seeded Project 1");
    expect(extractJsonLd(html).find((schema) => schema["@type"] === "ItemList")).toBeUndefined();
  });

  it("ships no ItemList when the server payload is empty (swallowed fetch error)", async () => {
    mockGetCommunityProjects.mockResolvedValue(makeServerPage(0));

    const html = await renderPageToHtml();

    expect(extractJsonLd(html).find((schema) => schema["@type"] === "ItemList")).toBeUndefined();
  });
});
