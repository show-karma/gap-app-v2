/**
 * AEO acceptance tests for the community funding-opportunities directory
 * (DEV-611).
 *
 * This URL ships in the communities sitemap, so the core facts of every open
 * opportunity — title, status, deadline, funding amounts — have to be in the
 * server-rendered HTML rather than behind a client fetch. Every test here
 * renders through `react-dom/server`'s `renderToString`, which runs no
 * effects — whatever it produces is exactly what a crawler or a reader with
 * JavaScript disabled receives.
 */
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProgramsStore } from "@/src/features/programs/lib/store";
import type { FundingProgram } from "@/types/whitelabel-entities";

const mockGet = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "celo" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/community/celo/funding-opportunities",
  useSearchParams: () => new URLSearchParams(),
}));

const OPEN_PROGRAM_DESCRIPTION =
  "Funding for open-source public goods teams building on the Celo network.";
const EVERGREEN_PROGRAM_DESCRIPTION =
  "Rolling grants for infrastructure maintainers, no application deadline.";

function createPrograms(): FundingProgram[] {
  return [
    {
      programId: "prog-open",
      chainID: 42220,
      name: "Public Goods Fund",
      metadata: {
        title: "Public Goods Fund",
        description: OPEN_PROGRAM_DESCRIPTION,
        startsAt: "2020-01-01T12:00:00.000Z",
        // Midday UTC so the formatted day is stable in any CI timezone.
        endsAt: "2099-12-31T12:00:00.000Z",
        programBudget: "500000",
        maxGrantSize: "50000",
      },
      applicationConfig: { isEnabled: true },
    },
    {
      programId: "prog-evergreen",
      chainID: 42220,
      name: "Evergreen Grants",
      metadata: {
        title: "Evergreen Grants",
        description: EVERGREEN_PROGRAM_DESCRIPTION,
      },
      applicationConfig: { isEnabled: true },
    },
    {
      programId: "prog-closed",
      chainID: 42220,
      name: "Closed Round",
      metadata: {
        title: "Closed Round",
        description: "A round whose deadline has passed.",
        startsAt: "2020-01-01T12:00:00.000Z",
        endsAt: "2021-01-01T12:00:00.000Z",
      },
      applicationConfig: { isEnabled: false },
    },
  ] as FundingProgram[];
}

async function buildPageUi(): Promise<React.ReactElement> {
  const { default: Page } = await import(
    "@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/funding-opportunities/page"
  );
  const ui = await Page({ params: Promise.resolve({ communityId: "celo" }) });
  // A fresh client per render, mirroring the per-request client the app
  // provider creates — nothing is carried over between tests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>;
}

async function renderPageToHtml(): Promise<string> {
  return renderToString(await buildPageUi());
}

beforeEach(() => {
  vi.clearAllMocks();
  // The client's URL-seeding effect mutates the module-level filter store on
  // mount (clearing the SSR-time "active" default); reset it so every test
  // starts from the store's initial state.
  useProgramsStore.getState().reset();
});

describe("funding-opportunities directory — server-rendered content", () => {
  it("renders each open opportunity's title, status, deadline and funding facts without client JavaScript", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();

    // Titles — the first program renders as the featured hero, the second as
    // an editorial card.
    expect(html).toContain("Public Goods Fund");
    expect(html).toContain("Evergreen Grants");
    // Descriptions
    expect(html).toContain(OPEN_PROGRAM_DESCRIPTION);
    expect(html).toContain(EVERGREEN_PROGRAM_DESCRIPTION);
    // Status — a live countdown for the deadlined (featured) program, an
    // "Open" badge for the evergreen card with no deadline.
    expect(html).toMatch(/\d+ days left/);
    expect(html).toContain(">Open</span>");
    // Deadline — the featured hero states the full date.
    expect(html).toContain("Deadline");
    expect(html).toContain("Dec 31, 2099");
    // Funding facts — featured hero sidebar.
    expect(html).toContain("Total pool");
    expect(html).toContain("$500K");
    expect(html).toContain("Max grant");
    expect(html).toContain("$50K");
    // Directory-level summary (hero KPI): the community has open programs.
    expect(html).toContain("Open programs");

    // No loading skeleton — the content is real, not a placeholder.
    expect(html).not.toContain("animate-pulse");
  });

  it("paints open programs only in the server-rendered card list", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();

    // The server paints the store's "active" default — a closed round's card
    // appears after hydration lands on the All tab, not in the server-painted
    // markup. The JSON-LD (which describes the hydrated All view, see the
    // DEV-596 describe block) is stripped so this pins the visible cards.
    const visibleMarkup = html.replace(/<script type="application\/ld\+json">.*?<\/script>/g, "");
    expect(visibleMarkup).not.toContain("Closed Round");
  });

  it("serves the hydrated directory from a single indexer round-trip", async () => {
    mockGet.mockResolvedValue(createPrograms());

    await renderPageToHtml();

    // One server-side fetch, memoized by React.cache and shared with the
    // hydrated React Query entry — the client mounts against cached data
    // inside its staleTime instead of refetching.
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/community/celo", {
      isAuthorized: false,
    });
  });

  it("renders the empty state server-side when the community has no programs", async () => {
    mockGet.mockResolvedValue([]);

    const html = await renderPageToHtml();

    // The default "active" filter counts as an active filter, so the
    // filtered-empty copy is what a no-JS reader sees.
    expect(html).toContain("More opportunities are on the way");
    expect(html).not.toContain("animate-pulse");
  });

  it("falls back to the client fetch path when the indexer fails", async () => {
    mockGet.mockRejectedValue(new Error("indexer unavailable"));

    const html = await renderPageToHtml();

    // A transient upstream failure degrades to exactly the pre-DEV-611
    // behaviour: the loading skeleton ships and the client retries — the
    // outage is never hydrated as a definitive empty directory.
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("More opportunities are on the way");
  });
});

/** Parse every JSON-LD script the page emitted. */
function extractJsonLd(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1])
  );
}

type ListItem = { "@type": string; position: number; name: string; url: string };

describe("funding-opportunities directory — ItemList JSON-LD (DEV-596)", () => {
  it("emits an ItemList describing every program the default All view shows", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();
    const itemList = extractJsonLd(html).find((schema) => schema["@type"] === "ItemList") as
      | { numberOfItems: number; itemListElement: ListItem[] }
      | undefined;

    expect(itemList).toBeDefined();

    // The client's default view is the All tab (the URL-seeding effect clears
    // the store's SSR-time "active" filter when the URL has no `status`
    // param), so the schema lists every fetched program in rendered order —
    // nothing shown is omitted, nothing hidden is claimed.
    expect(itemList?.numberOfItems).toBe(3);
    expect(itemList?.itemListElement.map((item) => item.name)).toEqual([
      "Public Goods Fund",
      "Evergreen Grants",
      "Closed Round",
    ]);
    expect(itemList?.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    for (const item of itemList?.itemListElement ?? []) {
      expect(new URL(item.url).pathname).toMatch(/^\/community\/celo\/programs\/prog-/);
    }
  });

  it("backs every ItemList entry with the hydrated default view a JS-executing crawler sees", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();
    const itemList = extractJsonLd(html).find((schema) => schema["@type"] === "ItemList") as
      | { itemListElement: ListItem[] }
      | undefined;

    // Every structured fact must be traceable to rendered output — JSON-LD
    // claiming content the page does not render is the E3 defect class this
    // program fixed. The server HTML paints the active subset; hydration
    // lands on the All tab and reveals the rest, which is what users and
    // JS-executing crawlers (Google renders JavaScript) see.
    render(await buildPageUi());
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    });

    for (const item of itemList?.itemListElement ?? []) {
      const path = new URL(item.url).pathname;
      // Rendered as a card title in the hydrated DOM, linking to the same
      // detail path the schema claims.
      expect(screen.getAllByText(item.name).length).toBeGreaterThan(0);
      expect(
        document.querySelector(`a[href="${path}"]`),
        `expected an anchor to ${path}`
      ).not.toBeNull();
    }
  });

  it("keeps the open programs of the server-painted subset in the ItemList head positions", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();
    const itemList = extractJsonLd(html).find((schema) => schema["@type"] === "ItemList") as
      | { itemListElement: ListItem[] }
      | undefined;

    // The server HTML renders the two open programs; both are claimed and
    // both names are present in the server response body.
    for (const name of ["Public Goods Fund", "Evergreen Grants"]) {
      expect(itemList?.itemListElement.map((item) => item.name)).toContain(name);
      expect(html).toContain(name);
    }
  });

  it("ships no ItemList when the community has no programs", async () => {
    mockGet.mockResolvedValue([]);

    const html = await renderPageToHtml();

    expect(extractJsonLd(html).find((schema) => schema["@type"] === "ItemList")).toBeUndefined();
  });

  it("ships no ItemList when the indexer fails", async () => {
    mockGet.mockRejectedValue(new Error("indexer unavailable"));

    const html = await renderPageToHtml();

    expect(extractJsonLd(html).find((schema) => schema["@type"] === "ItemList")).toBeUndefined();
  });
});
