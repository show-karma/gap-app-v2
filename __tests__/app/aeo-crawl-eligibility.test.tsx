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
import fs from "node:fs";
import path from "node:path";
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
    .replace(/&(?:#x27;|#39;|apos;)/g, "'")
    .replace(/&quot;/g, '"')
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
    const { metadata } = await import("@/app/t/[tenant]/seeds/page");

    expect(canonicalOf(metadata)).toBe("/seeds");
  });

  it("keeps its bespoke openGraph and twitter copy", async () => {
    const { metadata } = await import("@/app/t/[tenant]/seeds/page");

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
    const { metadata } = await import("@/app/t/[tenant]/communities/page");

    expect(canonicalOf(metadata)).toBe("/communities");
  });
});

describe("/nonprofits/find-funders — server-rendered landing page", () => {
  const HERO_H1 = "Stop hunting for funders. Ask an agent.";

  /**
   * The page's server output IS the no-JS reader's page since DEV-612: the
   * route (and every ancestor) has no loading.tsx, so nothing above it creates
   * a Suspense boundary and the whole page renders into the initially visible
   * HTML. The earlier DEV-586 <noscript> hero replica in the root layout is
   * gone — it existed only because a loading boundary used to stream the page
   * as a hidden `<div hidden id="S:n">` chunk.
   */
  async function renderFindFunders(): Promise<{ pageHtml: string }> {
    const { default: Page } = await import("@/app/t/[tenant]/nonprofits/find-funders/page");
    return { pageHtml: renderToString(Page()) };
  }

  it("the page h1 is the hero heading, and there is exactly one h1", async () => {
    const { pageHtml } = await renderFindFunders();

    expect(headings(pageHtml)).toEqual([HERO_H1]);
  });

  it("the hero carries the lead copy and every example chip from lib/hero-content", async () => {
    const { HERO_CHIPS } = await import("@/src/features/non-profits/lib/hero-content");
    const { pageHtml } = await renderFindFunders();
    const text = visibleText(pageHtml);

    expect(text).toContain("AI agents that find the right foundations and funders");
    for (const chip of HERO_CHIPS) {
      expect(text).toContain(chip.text);
    }
  });

  // The route previously served ~1.1k chars of navbar and footer chrome and
  // none of the landing copy, because `dynamic(..., { ssr: false })` rendered
  // nothing at all on the server.
  it("server-renders the landing sections a crawler indexes, not just a spinner", async () => {
    const text = visibleText((await renderFindFunders()).pageHtml);

    expect(text.length).toBeGreaterThan(2000);
    expect(text).toContain("grounded in every");
    expect(text).toContain("THE SHIFT");
    expect(text).toContain("YOUR AGENT TEAM");
    expect(text).toContain("HOW IT WORKS");
    expect(text).toContain("THE DATA");
  });

  it("self-canonicals at its own path", async () => {
    const { metadata } = await import("@/app/t/[tenant]/nonprofits/find-funders/page");

    expect(canonicalOf(metadata)).toBe("/nonprofits/find-funders");
  });

  describe("direct-answer FAQ (DEV-595 experiment E5)", () => {
    /**
     * `visibleText` replaces tags with a space, so an answer that ends in a
     * linked URL renders as "…connect ." — collapse the space the anchor's
     * closing tag left before punctuation so prose comparisons still hold.
     */
    const faqProse = (html: string) => visibleText(html).replace(/\s+([.,;:!?])/g, "$1");

    it("the page renders every FAQ question and answer", async () => {
      const { FIND_FUNDERS_FAQS } = await import("@/src/features/non-profits/lib/faq-content");
      const { pageHtml } = await renderFindFunders();
      const text = faqProse(pageHtml);

      for (const faq of FIND_FUNDERS_FAQS) {
        expect(text).toContain(faq.question);
        expect(text).toContain(visibleText(faq.answer));
      }
    });

    it("emits FAQPage JSON-LD built from the same array the visible sections render", async () => {
      const { FIND_FUNDERS_FAQS } = await import("@/src/features/non-profits/lib/faq-content");
      const { pageHtml } = await renderFindFunders();

      const scripts = Array.from(
        pageHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
      ).map((match) => JSON.parse(match[1].replace(/\\u003c/g, "<")));
      const faqSchema = scripts.find((schema) => schema["@type"] === "FAQPage");

      expect(faqSchema).toBeDefined();
      expect(faqSchema.mainEntity.map((entity: { name: string }) => entity.name)).toEqual(
        FIND_FUNDERS_FAQS.map((faq) => faq.question)
      );
      expect(
        faqSchema.mainEntity.map(
          (entity: { acceptedAnswer: { text: string } }) => entity.acceptedAnswer.text
        )
      ).toEqual(FIND_FUNDERS_FAQS.map((faq) => faq.answer));
    });

    it("answers the funder-discovery facts the experiment targets, in visible text", async () => {
      const { pageHtml } = await renderFindFunders();
      const text = visibleText(pageHtml);

      // P007 / P028 — past grants and typical grant size from filings.
      expect(text).toContain("past grants and giving history");
      expect(text).toContain("lists each grant it paid and the amount");
      // P018 — works from ChatGPT / Claude via the MCP connector.
      expect(text).toContain("ChatGPT or Claude");
      expect(text).toContain("gapapi.karmahq.xyz/mcp");
      // P035 — free for nonprofits.
      expect(text).toContain("Connecting and asking questions is free");
      // Data coverage claim stays tied to the reviewed stats module.
      const { FILINGS_STATS } = await import("@/src/features/non-profits/lib/stats");
      expect(text).toContain(`over ${FILINGS_STATS.countLong} filings`);
    });

    it("renders the URL mentions as anchors in the page", async () => {
      const { FIND_FUNDERS_FAQ_LINKS } = await import("@/src/features/non-profits/lib/faq-content");
      const { NON_PROFITS_PAGES } = await import("@/utilities/pages");
      const { ROOT_DOMAIN } = await import("@/utilities/domains");
      const { pageHtml } = await renderFindFunders();

      // The internal link resolves through the route constant, not a
      // hardcoded path; the MCP endpoint is external and absolute.
      expect(FIND_FUNDERS_FAQ_LINKS[`${ROOT_DOMAIN}/nonprofits/find-funders/connect`]).toBe(
        NON_PROFITS_PAGES.CONNECT
      );

      expect(pageHtml).toContain('href="https://gapapi.karmahq.xyz/mcp"');
      expect(pageHtml).toContain(`href="${NON_PROFITS_PAGES.CONNECT}"`);
    });

    it("keeps the JSON-LD answers plain text even where the visible FAQ links", async () => {
      const { FIND_FUNDERS_FAQS } = await import("@/src/features/non-profits/lib/faq-content");

      for (const faq of FIND_FUNDERS_FAQS) {
        expect(faq.answer).not.toMatch(/<[a-z]/i);
      }
    });

    it("keeps the FAQ prose free of em-dashes", async () => {
      const { FIND_FUNDERS_FAQS } = await import("@/src/features/non-profits/lib/faq-content");

      for (const faq of FIND_FUNDERS_FAQS) {
        expect(faq.question).not.toContain("—");
        expect(faq.answer).not.toContain("—");
      }
    });
  });

  /**
   * Structural guard, updated for DEV-612: the sitemap-listed routes in this
   * segment (the landing page and the /connect trio) must have NO loading.tsx
   * — a loading boundary would stream their HTML as a hidden Suspense chunk
   * and no-JS readers would see only the fallback. The non-sitemap workbench
   * subroutes each keep their own loading.tsx so a navigation inside
   * find-funders keeps its instant loading state.
   */
  it("keeps loading boundaries off the sitemap routes and on the workbench subroutes", () => {
    const segment = path.join(process.cwd(), "app/t/[tenant]/nonprofits/find-funders");

    for (const forbidden of [
      "loading.tsx",
      "connect/loading.tsx",
      "connect/claude/loading.tsx",
      "connect/chatgpt/loading.tsx",
    ]) {
      expect(fs.existsSync(path.join(segment, forbidden)), forbidden).toBe(false);
    }

    for (const subroute of [
      "search/[id]/loading.tsx",
      "foundations/[id]/loading.tsx",
      "grants/[id]/loading.tsx",
      "nonprofits/[id]/loading.tsx",
    ]) {
      expect(fs.existsSync(path.join(segment, subroute)), subroute).toBe(true);
    }
  });
});
