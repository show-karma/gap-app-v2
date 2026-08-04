/**
 * AEO acceptance tests for the funding-program detail route (DEV-585).
 *
 * These URLs ship in the funding-programs sitemap, so the core facts have to be
 * in the server-rendered HTML rather than behind a client fetch. Every test
 * here renders through `react-dom/server`'s `renderToString`, which runs no
 * effects — whatever it produces is exactly what a crawler or a reader with
 * JavaScript disabled receives.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { renderToString } from "react-dom/server";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { HttpError } from "@/utilities/api/errors";

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
  useParams: () => ({ communityId: "c1", programId: "prog-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/community/c1/programs/prog-1",
}));

// The real provider depends on the Privy bridge, which has no server-side
// equivalent. Guest defaults (`isLoading: true`) are what actually resolves
// during SSR, so mirror them rather than granting permissions.
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePermissionContext: () => ({
    isLoading: true,
    isCommunityAdmin: false,
    isReviewer: false,
    can: () => false,
  }),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", theme: "light", setTheme: vi.fn() }),
}));

// `getWhitelabelContext` reads request headers, which have no request scope
// under renderToString. The non-whitelabel default mirrors what resolves on
// the main karmahq domain.
vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: async () => ({ isWhitelabel: false, config: null }),
}));

const PROGRAM_DESCRIPTION =
  "Funding for open-source public goods teams building on the Celo network.";

function createMockProgram(overrides: Partial<FundingProgram> = {}): FundingProgram {
  return {
    programId: "prog-1",
    chainID: 42220,
    name: "Public Goods Fund",
    communitySlug: "celo",
    metadata: {
      title: "Public Goods Fund",
      description: PROGRAM_DESCRIPTION,
      startsAt: "2099-01-01T00:00:00.000Z",
      endsAt: "2099-12-31T00:00:00.000Z",
      programBudget: "500000",
      minGrantSize: "5000",
      maxGrantSize: "50000",
      grantTypes: ["Infrastructure", "Research"],
    },
    applicationConfig: {
      isEnabled: true,
      formSchema: {
        title: "Apply",
        fields: [{ id: "f1", label: "Name", type: "text", required: true }],
      },
    },
    ...overrides,
  } as FundingProgram;
}

async function renderPageToHtml(): Promise<string> {
  const { default: Page } = await import(
    "@/app/community/[communityId]/(whitelabel)/programs/[programId]/page"
  );
  const ui = await Page({ params: Promise.resolve({ communityId: "c1", programId: "prog-1" }) });
  // A fresh client per render, mirroring the per-request client the app
  // provider creates — nothing is carried over between tests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("funding-program detail page — server-rendered content", () => {
  it("renders title, status, description and key facts without client JavaScript", async () => {
    mockGet.mockResolvedValue(createMockProgram());

    const html = await renderPageToHtml();

    // Title
    expect(html).toContain("Public Goods Fund");
    // Status — stated in the body, not merely implied by the apply button
    expect(html).toContain("Coming Soon");
    // Description
    expect(html).toContain(PROGRAM_DESCRIPTION);
    // Key facts from the details sidebar
    expect(html).toContain("Program Budget");
    expect(html).toContain("$500,000");
    expect(html).toContain("Funding Range");
    expect(html).toContain("$5,000 - $50,000");
    expect(html).toContain("Grant Types");
    expect(html).toContain("Infrastructure");
    expect(html).toContain("Starts");
    expect(html).toContain("Jan 1, 2099");
    expect(html).toContain("Ends");
    expect(html).toContain("Dec 31, 2099");

    // No loading skeleton — the content is real, not a placeholder.
    expect(html).not.toContain("animate-pulse");
  });

  it("serves the hydrated program without a second fetch on the client", async () => {
    mockGet.mockResolvedValue(createMockProgram());

    await renderPageToHtml();

    // One server-side fetch, deduped across generateMetadata and the render
    // path by React.cache. The hydrated entry is inside its staleTime, so the
    // client mounts against cached data instead of refetching.
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/v2/funding-program-configs/prog-1", {
      isAuthorized: false,
    });
  });

  it("renders the open-for-applications status for a live program", async () => {
    mockGet.mockResolvedValue(
      createMockProgram({
        metadata: {
          title: "Live Program",
          description: PROGRAM_DESCRIPTION,
          startsAt: "2020-01-01T00:00:00.000Z",
          endsAt: "2099-12-31T00:00:00.000Z",
        },
      })
    );

    const html = await renderPageToHtml();

    expect(html).toContain("Live Program");
    expect(html).toContain("Open for Applications");
  });

  it("renders the closed status and disabled apply copy for a disabled program", async () => {
    mockGet.mockResolvedValue(
      createMockProgram({
        applicationConfig: {
          isEnabled: false,
          formSchema: { title: "Apply", fields: [] },
        } as FundingProgram["applicationConfig"],
      })
    );

    const html = await renderPageToHtml();

    expect(html).toContain("Applications Closed");
    expect(html).toContain("Applications are currently closed");
  });

  it("renders the not-found state server-side when the indexer returns 404", async () => {
    mockGet.mockRejectedValue(
      new HttpError(404, { endpoint: "/v2/funding-program-configs/prog-1", method: "GET" })
    );

    const html = await renderPageToHtml();

    expect(html).toContain("Program not found");
    expect(html).not.toContain("animate-pulse");
  });

  it("falls back to the client fetch path when the indexer fails", async () => {
    mockGet.mockRejectedValue(
      new HttpError(500, { endpoint: "/v2/funding-program-configs/prog-1", method: "GET" })
    );

    const html = await renderPageToHtml();

    // A transient upstream failure must never be hydrated as a definitive
    // "Program not found" — the page degrades to the skeleton and the client
    // retries.
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("Program not found");
  });
});

/** Parse every JSON-LD script the page emitted. */
function extractJsonLd(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1])
  );
}

describe("funding-program detail page — Grant JSON-LD (DEV-596)", () => {
  it("emits a Grant whose every fact appears in the rendered HTML", async () => {
    mockGet.mockResolvedValue(createMockProgram());

    const html = await renderPageToHtml();
    const grant = extractJsonLd(html).find((schema) => schema["@type"] === "Grant") as
      | Record<string, unknown>
      | undefined;

    expect(grant).toBeDefined();

    // Every structured fact must be traceable to the visible server HTML —
    // JSON-LD claiming content the page does not render is the E3 defect
    // class this program fixed.
    expect(grant?.name).toBe("Public Goods Fund");
    expect(html).toContain("Public Goods Fund");

    expect(grant?.description).toBe(PROGRAM_DESCRIPTION);
    expect(html).toContain(PROGRAM_DESCRIPTION);

    // Funder mirrors the visible "by celo" byline.
    expect(grant?.funder).toEqual({ "@type": "Organization", name: "celo" });
    expect(html).toContain("celo");

    // Canonical URL of this page.
    expect(grant?.url).toMatch(/\/community\/c1\/programs\/prog-1$/);

    // Deliberately absent: the program budget is the round's pool, not a
    // single grant's amount, so it must not be claimed as one.
    expect(grant).not.toHaveProperty("amount");
  });

  it("omits the funder when the program has no community byline", async () => {
    mockGet.mockResolvedValue(createMockProgram({ communitySlug: undefined }));

    const html = await renderPageToHtml();
    const grant = extractJsonLd(html).find((schema) => schema["@type"] === "Grant");

    expect(grant).toBeDefined();
    expect(grant).not.toHaveProperty("funder");
  });

  it("ships no Grant schema when the program is not found", async () => {
    mockGet.mockRejectedValue(
      new HttpError(404, { endpoint: "/v2/funding-program-configs/prog-1", method: "GET" })
    );

    const html = await renderPageToHtml();

    expect(extractJsonLd(html).find((schema) => schema["@type"] === "Grant")).toBeUndefined();
  });

  it("ships no Grant schema when the indexer fails", async () => {
    mockGet.mockRejectedValue(
      new HttpError(500, { endpoint: "/v2/funding-program-configs/prog-1", method: "GET" })
    );

    const html = await renderPageToHtml();

    expect(extractJsonLd(html).find((schema) => schema["@type"] === "Grant")).toBeUndefined();
  });
});
