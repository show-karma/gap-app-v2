import * as Sentry from "@sentry/nextjs";
import { STATIC_FALLBACK_TOOLS } from "@/components/Pages/ForAgents/content";
import { fetchToolCatalog } from "@/components/Pages/ForAgents/fetchToolCatalog";
import type { PublicToolMetadata } from "@/components/Pages/ForAgents/types";

const SAMPLE_TOOLS: PublicToolMetadata[] = [
  {
    name: "get_project_details",
    alias: "karma_project_get_details",
    description: "Get full project details.",
    category: "project",
    requiresAuth: false,
  },
  {
    name: "list_funding_programs",
    alias: undefined,
    description: "Browse open funding programs.",
    category: "program",
    requiresAuth: false,
  },
];

describe("fetchToolCatalog", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns the live tools when upstream responds with a populated tools array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tools: SAMPLE_TOOLS }) })
    );

    const result = await fetchToolCatalog();

    expect(result).toEqual(SAMPLE_TOOLS);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("falls back to STATIC_FALLBACK_TOOLS when upstream returns a non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    const result = await fetchToolCatalog();

    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("502") }),
      expect.objectContaining({ tags: { component: "for-agents/tool-catalog" } })
    );
  });

  it("falls back when fetch itself rejects (network error)", async () => {
    const networkError = new Error("ECONNREFUSED");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    const result = await fetchToolCatalog();

    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      networkError,
      expect.objectContaining({ tags: { component: "for-agents/tool-catalog" } })
    );
  });

  it("falls back when upstream returns an empty tools array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tools: [] }) })
    );

    const result = await fetchToolCatalog();

    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("empty") }),
      expect.objectContaining({ tags: { component: "for-agents/tool-catalog" } })
    );
  });

  it("falls back when fetch is aborted by the timeout signal", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const result = await fetchToolCatalog();

    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      abortError,
      expect.objectContaining({ tags: { component: "for-agents/tool-catalog" } })
    );
  });

  it("falls back when the upstream body is not the expected shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tools: "not-an-array" }) })
    );

    const result = await fetchToolCatalog();

    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("calls fetch against the configured indexer URL with the 1h revalidate hint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ tools: SAMPLE_TOOLS }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchToolCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/mcp\/tools$/);
    expect(init).toMatchObject({ next: { revalidate: 3600 } });
    expect(init.signal).toBeDefined();
  });

  it("falls back when NEXT_PUBLIC_GAP_INDEXER_URL is unset", async () => {
    vi.resetModules();
    vi.doMock("@/utilities/enviromentVars", () => ({
      envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "" },
    }));
    // Re-import Sentry under the same module-resolution pass so the spy
    // we assert on is the one the freshly-imported fetchToolCatalog calls.
    const SentryReimport = await import("@sentry/nextjs");
    vi.mocked(SentryReimport.captureException).mockClear();
    const { fetchToolCatalog: fetchWithUnset } = await import(
      "@/components/Pages/ForAgents/fetchToolCatalog"
    );

    const result = await fetchWithUnset();

    // The error comes from the shared `getIndexerBaseUrl()` helper now;
    // we only assert that fallback engages and Sentry was called for the
    // unset-env-var path — the specific wording belongs to wellKnown's tests.
    expect(result).toEqual(STATIC_FALLBACK_TOOLS);
    expect(SentryReimport.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("NEXT_PUBLIC_GAP_INDEXER_URL") }),
      expect.objectContaining({ tags: { component: "for-agents/tool-catalog" } })
    );
  });
});
