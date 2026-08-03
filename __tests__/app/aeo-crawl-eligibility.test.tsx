/**
 * Crawl-eligibility regressions for the three URLs a production sitemap crawl
 * of v1.8.20 flagged (DEV-586 / AEO-03).
 *
 * The crawl fetches each sitemap URL with JavaScript disabled and calls a page
 * `thin` when it has no <h1> or too little visible text, and `non-canonical`
 * when it declares a canonical other than itself. Three URLs failed:
 *
 *   /seeds                      — inherited the root layout's canonical "/"
 *   /communities                — <h1> sat below the loading early-returns
 *   /nonprofits/find-funders    — whole page was dynamic(ssr: false)
 *
 * These assertions are about the server output only — `renderToString` runs no
 * effects and resolves no queries, so what it produces is what a non-executing
 * crawler receives.
 */
import type { Metadata } from "next";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The static sitemap pulls blog slugs from Sanity, whose gateway validates the
// client env at import time. Blog entries are irrelevant here — only the
// hardcoded static paths are.
vi.mock("@/sanity/lib/gateway", () => ({
  getPublishedSlugs: vi.fn(async () => []),
}));

const { communitiesState, statsState } = vi.hoisted(() => ({
  communitiesState: {
    current: {
      data: undefined as unknown,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isLoading: true,
      isError: false,
      error: null as Error | null,
      refetch: vi.fn(),
    },
  },
  statsState: {
    current: {
      data: undefined as unknown,
      isLoading: true,
      isError: false,
    },
  },
}));

vi.mock("@/hooks/useCommunities", () => ({
  useCommunities: () => communitiesState.current,
}));

vi.mock("@/hooks/useCommunityStats", () => ({
  useCommunityStats: () => statsState.current,
}));

/** Visible text a reader sees with JavaScript disabled — the crawler's view. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function headings(html: string): string[] {
  return Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map((match) =>
    visibleText(match[1])
  );
}

function canonicalOf(metadata: Metadata): string | undefined {
  const canonical = metadata.alternates?.canonical;
  return typeof canonical === "string" ? canonical : undefined;
}

const MIN_MEANINGFUL_CHARS = 200;

describe("/seeds — canonical", () => {
  it("self-canonicals instead of inheriting the root layout's '/'", async () => {
    const { metadata } = await import("@/app/seeds/page");

    expect(canonicalOf(metadata)).toBe("/seeds");
  });

  it("keeps its bespoke openGraph and twitter copy", async () => {
    const { metadata } = await import("@/app/seeds/page");

    expect(metadata.openGraph?.title).toBe("Karma Seeds - Accept Support Without a Token");
    expect(metadata.twitter?.title).toBe("Karma Seeds - Raise Funds for Your Project");
    expect(metadata.openGraph?.images).toBeDefined();
  });

  it("is submitted in the static sitemap, which is what obliges it to self-canonical", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const urls = (await staticSitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/seeds"))).toBe(true);
  });
});

describe("/communities — heading survives every query state", () => {
  const HEADING = "Organizations on Karma";

  async function renderCommunities(): Promise<string> {
    const { CommunitiesPage } = await import("@/components/Pages/Communities/CommunitiesPage");
    return renderToString(<CommunitiesPage />);
  }

  beforeEach(() => {
    communitiesState.current = {
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    statsState.current = { data: undefined, isLoading: true, isError: false };
  });

  // The server render is always this case: no query has resolved, which is
  // exactly the state whose early return used to swallow the <h1>.
  it("renders the h1 and lead paragraph while both queries are loading", async () => {
    const html = await renderCommunities();

    expect(headings(html)).toContain(HEADING);
    expect(visibleText(html)).toContain("Explore organizations running grants");
    expect(visibleText(html).length).toBeGreaterThan(MIN_MEANINGFUL_CHARS);
  });

  it("still renders the h1 when the communities query fails, alongside a retry", async () => {
    communitiesState.current = {
      ...communitiesState.current,
      isLoading: false,
      isError: true,
      error: new Error("indexer unavailable"),
    };

    const html = await renderCommunities();

    expect(headings(html)).toContain(HEADING);
    expect(visibleText(html)).toContain("indexer unavailable");
    expect(visibleText(html)).toContain("Try again");
  });

  it("renders the h1 and an empty state when the query resolves with no communities", async () => {
    communitiesState.current = {
      ...communitiesState.current,
      data: { pages: [{ payload: [] }] },
      isLoading: false,
    };
    statsState.current = { data: undefined, isLoading: false, isError: false };

    const html = await renderCommunities();

    expect(headings(html)).toContain(HEADING);
    expect(visibleText(html)).toContain("No communities found.");
  });

  it("emits exactly one h1 while loading, so the skeleton adds no second heading", async () => {
    expect(headings(await renderCommunities())).toHaveLength(1);
  });

  it("self-canonicals at /communities", async () => {
    const { metadata } = await import("@/app/communities/page");

    expect(canonicalOf(metadata)).toBe("/communities");
  });
});

describe("/nonprofits/find-funders — server-rendered landing page", () => {
  async function renderFindFunders(): Promise<string> {
    const { default: Page } = await import("@/app/nonprofits/find-funders/page");
    return renderToString(<>{Page()}</>);
  }

  it("server-renders the hero h1", async () => {
    expect(headings(await renderFindFunders())).toContain(
      "Stop hunting for funders. Ask an agent."
    );
  });

  it("emits exactly one h1", async () => {
    expect(headings(await renderFindFunders())).toHaveLength(1);
  });

  // The route previously served ~1.1k chars of navbar and footer chrome and
  // none of the landing copy, because `dynamic(..., { ssr: false })` rendered
  // nothing at all on the server.
  it("server-renders the landing sections a crawler indexes, not just a spinner", async () => {
    const text = visibleText(await renderFindFunders());

    expect(text.length).toBeGreaterThan(2000);
    expect(text).toContain("grounded in every");
    expect(text).toContain("THE SHIFT");
    expect(text).toContain("YOUR AGENT TEAM");
    expect(text).toContain("HOW IT WORKS");
    expect(text).toContain("THE DATA");
  });

  it("self-canonicals at its own path", async () => {
    const { metadata } = await import("@/app/nonprofits/find-funders/page");

    expect(canonicalOf(metadata)).toBe("/nonprofits/find-funders");
  });
});
