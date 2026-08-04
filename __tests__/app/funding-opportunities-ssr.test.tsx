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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

async function renderPageToHtml(): Promise<string> {
  const { default: Page } = await import(
    "@/app/community/[communityId]/(with-header)/funding-opportunities/page"
  );
  const ui = await Page({ params: Promise.resolve({ communityId: "celo" }) });
  // A fresh client per render, mirroring the per-request client the app
  // provider creates — nothing is carried over between tests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("lists open programs only under the default filter", async () => {
    mockGet.mockResolvedValue(createPrograms());

    const html = await renderPageToHtml();

    // The default view is the answer to "what can I apply to now" — a closed
    // round is reachable through the Closed tab after hydration, not in the
    // crawlable default HTML.
    expect(html).not.toContain("Closed Round");
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
