import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProjectIndexabilityEndpoint } from "@/utilities/project-indexability";
import {
  clearProjectIndexabilityLkgCache,
  fetchProjectIndexabilityDecision,
  PROJECT_INDEXABILITY_LKG_TTL_MS,
  type ProjectIndexabilityDecision,
  parseProjectIndexabilityDecision,
} from "@/utilities/project-indexability-client";
import { createProjectIndexabilityLkgCache } from "@/utilities/project-indexability-lkg-cache";

/**
 * RED (Edge-safe project indexability client, ADR 0001, D5). A strict runtime
 * parser for the five backend decision outcomes, plus a fail-closed fetcher:
 * 404/410 map to gone (even for non-JSON bodies); every other failure
 * (5xx / invalid JSON / invalid shape / missing baseUrl / network / timeout)
 * degrades to noindex-follow at the parsed normalizedPath. Framework-free so it
 * runs on the Edge runtime; the fetcher is injected for testability.
 */

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const parsed = {
  identifier: "paraswap",
  query: { route: "team" as const },
  normalizedPath: "/project/paraswap/team",
};

const BASE_URL = "https://api.example.com";
const ENDPOINT = buildProjectIndexabilityEndpoint(BASE_URL, parsed);

const FAIL_CLOSED = {
  outcome: "noindex-follow",
  url: parsed.normalizedPath,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

// The last-known-good store is module state shared by every test in this file,
// so it is reset around each one: fail-closed expectations must not be served a
// decision cached by an earlier success.
beforeEach(() => {
  clearProjectIndexabilityLkgCache();
});

afterEach(() => {
  clearProjectIndexabilityLkgCache();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("parseProjectIndexabilityDecision", () => {
  const validDecisions: Array<{ name: string; value: unknown }> = [
    {
      name: "canonical-indexable",
      value: { outcome: "canonical-indexable", url: "/project/paraswap" },
    },
    {
      name: "duplicate-alias",
      value: {
        outcome: "duplicate-alias",
        url: "/project/paraswap/about",
        canonicalUrl: "/project/paraswap",
      },
    },
    {
      name: "noindex-follow",
      value: { outcome: "noindex-follow", url: "/project/paraswap/team" },
    },
    {
      name: "redirect",
      value: {
        outcome: "redirect",
        from: "/project/old-paraswap",
        to: "/project/paraswap",
      },
    },
    { name: "gone 404", value: { outcome: "gone", status: 404 } },
    { name: "gone 410", value: { outcome: "gone", status: 410 } },
  ];

  it.each(validDecisions)("parses the $name decision", ({ value }) => {
    expect(parseProjectIndexabilityDecision(value)).toEqual(value);
  });

  const invalidDecisions: Array<{ name: string; value: unknown }> = [
    { name: "unknown outcome", value: { outcome: "mystery", url: "/x" } },
    {
      name: "extra field",
      value: { outcome: "noindex-follow", url: "/x", extra: 1 },
    },
    { name: "missing url", value: { outcome: "canonical-indexable" } },
    {
      name: "wrong-typed url",
      value: { outcome: "canonical-indexable", url: 123 },
    },
    {
      name: "duplicate-alias missing canonicalUrl",
      value: { outcome: "duplicate-alias", url: "/x" },
    },
    { name: "redirect missing to", value: { outcome: "redirect", from: "/a" } },
    { name: "gone bad status", value: { outcome: "gone", status: 200 } },
    {
      name: "gone with extra field",
      value: { outcome: "gone", status: 404, url: "/x" },
    },
    { name: "null", value: null },
    { name: "string", value: "noindex-follow" },
    { name: "number", value: 42 },
    { name: "array", value: [] },
  ];

  it.each(invalidDecisions)("rejects the $name input", ({ value }) => {
    expect(parseProjectIndexabilityDecision(value)).toBeNull();
  });

  // Every URL field is a redirect/canonical target the middleware concatenates
  // with an origin, so a non-local value could produce a cross-origin 308. The
  // parser must reject any authority, query, fragment, backslash, control char,
  // or non-`/project/` path and fail closed.
  const maliciousDecisions: Array<{ name: string; value: unknown }> = [
    {
      name: "redirect to a userinfo authority (@evil)",
      value: { outcome: "redirect", from: "/project/x", to: "@evil.example/path" },
    },
    {
      name: "redirect to a protocol-relative //host",
      value: { outcome: "redirect", from: "/project/x", to: "//evil.example/x" },
    },
    {
      name: "absolute http URL",
      value: { outcome: "canonical-indexable", url: "https://evil.example/project/x" },
    },
    {
      name: "non-project local path",
      value: { outcome: "canonical-indexable", url: "/about" },
    },
    {
      name: "url carrying a query string",
      value: { outcome: "canonical-indexable", url: "/project/x?next=//evil" },
    },
    {
      name: "url carrying a fragment",
      value: { outcome: "noindex-follow", url: "/project/x#@evil" },
    },
    {
      name: "url carrying a backslash",
      value: { outcome: "canonical-indexable", url: "/project/x\\@evil.example" },
    },
    {
      name: "url carrying an embedded newline",
      value: { outcome: "canonical-indexable", url: "/project/x\nhttps://evil" },
    },
    {
      name: "bare /project/ with no identifier",
      value: { outcome: "canonical-indexable", url: "/project/" },
    },
    {
      name: "duplicate-alias with a hostile canonicalUrl",
      value: {
        outcome: "duplicate-alias",
        url: "/project/x/about",
        canonicalUrl: "https://evil.example/project/x",
      },
    },
    // Dot-segment traversal: the `/project/` prefix passes, but resolving the
    // value against an origin (`new URL`) collapses the `..` and escapes the
    // route, so these must be rejected.
    {
      name: "literal ../ traversal escaping the route",
      value: { outcome: "redirect", from: "/project/x", to: "/project/x/../../evil" },
    },
    {
      name: "percent-encoded dot traversal (%2e%2e)",
      value: { outcome: "canonical-indexable", url: "/project/%2e%2e/evil" },
    },
    {
      name: "uppercase percent-encoded dot traversal (%2E%2E)",
      value: { outcome: "canonical-indexable", url: "/project/x/%2E%2E/evil" },
    },
    {
      name: "bare dot-segment path (/project/..)",
      value: { outcome: "canonical-indexable", url: "/project/.." },
    },
    {
      name: "encoded forward slash in a segment (%2F)",
      value: { outcome: "canonical-indexable", url: "/project/a%2Fb" },
    },
    {
      name: "lowercase encoded forward slash in a segment (%2f)",
      value: { outcome: "redirect", from: "/project/x", to: "/project/a%2fb" },
    },
    {
      name: "encoded backslash in a segment (%5C)",
      value: { outcome: "canonical-indexable", url: "/project/a%5Cb" },
    },
  ];

  it.each(maliciousDecisions)("rejects the non-local URL field: $name", ({ value }) => {
    expect(parseProjectIndexabilityDecision(value)).toBeNull();
  });

  it("still accepts a well-formed local /project path with a hyphenated slug", () => {
    const value = { outcome: "redirect", from: "/project/old-slug", to: "/project/new-slug" };
    expect(parseProjectIndexabilityDecision(value)).toEqual(value);
  });

  it("accepts a multi-segment path whose segment carries a legitimate encoded space", () => {
    const value = { outcome: "canonical-indexable", url: "/project/weird%20slug/about" };
    expect(parseProjectIndexabilityDecision(value)).toEqual(value);
  });
});

describe("fetchProjectIndexabilityDecision", () => {
  it("GETs the exact endpoint with an application/json Accept header and returns a valid 200 decision", async () => {
    const decision = {
      outcome: "canonical-indexable",
      url: "/project/paraswap/team",
    };
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, decision));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(decision);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
      })
    );
  });

  it.each([404, 410])(
    "maps HTTP %s to gone with the same status even for a non-JSON body",
    async (status) => {
      const fetcher = vi.fn<Fetcher>(async () => new Response("Not Found", { status }));

      const result = await fetchProjectIndexabilityDecision(parsed, {
        baseUrl: BASE_URL,
        fetcher,
        timeoutMs: 5000,
      });

      expect(result).toEqual({ outcome: "gone", status });
    }
  );

  it("fails closed to noindex-follow on a 5xx", async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response("boom", { status: 500 }));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
  });

  it("fails closed when the 200 body is invalid JSON", async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response("{not-json", { status: 200 }));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
  });

  it("fails closed when the 200 body has an invalid decision shape", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, { outcome: "mystery" }));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
  });

  it("fails closed without fetching when baseUrl is missing", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, {}));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: "",
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed on a network error", async () => {
    const fetcher = vi.fn<Fetcher>(async () => {
      throw new Error("network down");
    });

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
  });

  it("fails closed on timeout/abort", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<Fetcher>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toEqual(FAIL_CLOSED);
  });

  it.each<[string, number | undefined]>([
    ["omitted", undefined],
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["positive Infinity", Number.POSITIVE_INFINITY],
  ])("aborts at the 2500ms default for a %s timeoutMs", async (_name, timeoutMs) => {
    vi.useFakeTimers();
    const fetcher = vi.fn<Fetcher>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs,
    });
    await vi.advanceTimersByTimeAsync(2500);

    await expect(promise).resolves.toEqual(FAIL_CLOSED);
  });

  it("does not remember a failed lookup: two consecutive 5xx both fail closed", async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response("boom", { status: 500 }));

    const first = await fetchProjectIndexabilityDecision(parsed, { baseUrl: BASE_URL, fetcher });
    const second = await fetchProjectIndexabilityDecision(parsed, { baseUrl: BASE_URL, fetcher });

    expect(first).toEqual(FAIL_CLOSED);
    expect(second).toEqual(FAIL_CLOSED);
  });

  it("clears the timeout timer on success", async () => {
    vi.useFakeTimers();
    const decision = {
      outcome: "noindex-follow",
      url: "/project/paraswap/team",
    };
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, decision));

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });

    expect(result).toEqual(decision);
    // A cleared timeout leaves no pending fake timers.
    expect(vi.getTimerCount()).toBe(0);
  });
});

/**
 * Last-known-good fallback. Fail-closed is the right default when nothing is
 * known, but it is the wrong answer when the same endpoint answered
 * "indexable" seconds ago and the indexer has merely blipped — that de-indexes
 * a healthy page. A successful decision is therefore replayed for at most
 * PROJECT_INDEXABILITY_LKG_TTL_MS after a failed lookup, and never longer.
 */
describe("fetchProjectIndexabilityDecision last-known-good fallback", () => {
  const INDEXABLE = {
    outcome: "canonical-indexable",
    url: "/project/paraswap/team",
  };

  function respondOnce(...responses: Array<() => Response>) {
    let index = 0;
    return vi.fn<Fetcher>(async () => {
      const factory = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return factory();
    });
  }

  async function primeIndexable(): Promise<void> {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, INDEXABLE));
    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
      timeoutMs: 5000,
    });
    expect(result).toEqual(INDEXABLE);
  }

  it("replays the last successful decision when the indexer returns 5xx", async () => {
    await primeIndexable();

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual(INDEXABLE);
  });

  // proxy.ts turns a `redirect` outcome into a 308, which browsers and crawlers
  // cache hard. Replaying a remembered relocation during an outage would move
  // users to a possibly-stale URL that outlives the outage, so redirects fail
  // closed even though indexability outcomes are replayed.
  it("never replays a remembered redirect: a later failure fails closed", async () => {
    const REDIRECT = {
      outcome: "redirect",
      from: "/project/paraswap-old/team",
      to: "/project/paraswap/team",
    };

    const primed = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: vi.fn<Fetcher>(async () => jsonResponse(200, REDIRECT)),
      timeoutMs: 5000,
    });
    expect(primed).toEqual(REDIRECT);

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual({ outcome: "noindex-follow", url: parsed.normalizedPath });
    expect(result.outcome).not.toBe("redirect");
  });

  it("replays the last successful decision when the indexer request times out", async () => {
    vi.useFakeTimers();
    await primeIndexable();

    const hangingFetcher = vi.fn<Fetcher>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: hangingFetcher,
      timeoutMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toEqual(INDEXABLE);
  });

  it("replays the last successful decision when the indexer returns an unparseable 200", async () => {
    await primeIndexable();

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("{not-json", { status: 200 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual(INDEXABLE);
  });

  it("replays the last successful decision one millisecond before the TTL expires", async () => {
    vi.useFakeTimers();
    await primeIndexable();
    await vi.advanceTimersByTimeAsync(PROJECT_INDEXABILITY_LKG_TTL_MS - 1);

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual(INDEXABLE);
  });

  it("falls back to noindex-follow once the TTL has elapsed", async () => {
    vi.useFakeTimers();
    await primeIndexable();
    await vi.advanceTimersByTimeAsync(PROJECT_INDEXABILITY_LKG_TTL_MS);

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual(FAIL_CLOSED);
  });

  it("keeps a fresh gone answer authoritative over a cached indexable decision", async () => {
    await primeIndexable();

    const result = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("gone", { status: 410 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual({ outcome: "gone", status: 410 });
  });

  it("never remembers a gone answer: a later failure fails closed rather than replaying 404", async () => {
    const fetcher = respondOnce(
      () => new Response("gone", { status: 404 }),
      () => new Response("boom", { status: 500 })
    );

    const gone = await fetchProjectIndexabilityDecision(parsed, { baseUrl: BASE_URL, fetcher });
    const afterFailure = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher,
    });

    expect(gone).toEqual({ outcome: "gone", status: 404 });
    expect(afterFailure).toEqual(FAIL_CLOSED);
  });

  it("forgets a remembered decision once the route is authoritatively gone", async () => {
    await primeIndexable();

    const gone = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("gone", { status: 410 })),
      timeoutMs: 5000,
    });
    // The removal happened; a blip right after it must not resurrect the page.
    const afterFailure = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(gone).toEqual({ outcome: "gone", status: 410 });
    expect(afterFailure).toEqual(FAIL_CLOSED);
  });

  it("forgets a remembered decision on a 200 body that says gone", async () => {
    await primeIndexable();

    const gone = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => jsonResponse(200, { outcome: "gone", status: 404 })),
      timeoutMs: 5000,
    });
    const afterFailure = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(gone).toEqual({ outcome: "gone", status: 404 });
    // Neither the old indexable decision nor the gone answer itself is replayed.
    expect(afterFailure).toEqual(FAIL_CLOSED);
  });

  it("does not let a delayed lookup overwrite a decision observed after it started", async () => {
    // A manual clock makes the two observation stamps unambiguous; the shared
    // module cache is bypassed so nothing else can interfere.
    let currentTime = 1_000_000;
    const lkgCache = createProjectIndexabilityLkgCache<ProjectIndexabilityDecision>({
      ttlMs: PROJECT_INDEXABILITY_LKG_TTL_MS,
      maxEntries: 10,
      now: () => currentTime,
    });
    const noindex: ProjectIndexabilityDecision = {
      outcome: "noindex-follow",
      url: parsed.normalizedPath,
    };

    let releaseSlowLookup: (() => void) | undefined;
    const slow = fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      timeoutMs: 60_000,
      lkgCache,
      fetcher: () =>
        new Promise<Response>((resolve) => {
          releaseSlowLookup = () => resolve(jsonResponse(200, INDEXABLE));
        }),
    });
    await vi.waitFor(() => expect(releaseSlowLookup).toBeDefined());

    // The project stops being indexable while the first lookup is still open.
    currentTime += 1000;
    await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      timeoutMs: 60_000,
      lkgCache,
      fetcher: respondOnce(() => jsonResponse(200, noindex)),
    });

    releaseSlowLookup?.();
    await expect(slow).resolves.toEqual(INDEXABLE);

    const duringOutage = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      timeoutMs: 60_000,
      lkgCache,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
    });

    expect(duringOutage).toEqual(noindex);
  });

  it("keys the cache per endpoint, so one route's success cannot rescue another route", async () => {
    await primeIndexable();

    const otherRoute = {
      identifier: "paraswap",
      query: { route: "root" as const },
      normalizedPath: "/project/paraswap",
    };
    const result = await fetchProjectIndexabilityDecision(otherRoute, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      timeoutMs: 5000,
    });

    expect(result).toEqual({
      outcome: "noindex-follow",
      url: otherRoute.normalizedPath,
    });
  });

  it("fails closed on a missing baseUrl even when a decision is cached", async () => {
    await primeIndexable();
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse(200, INDEXABLE));

    const result = await fetchProjectIndexabilityDecision(parsed, { baseUrl: "", fetcher });

    expect(result).toEqual(FAIL_CLOSED);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses an injected cache instead of the module-level one when provided", async () => {
    const injected = createProjectIndexabilityLkgCache<ProjectIndexabilityDecision>({
      ttlMs: PROJECT_INDEXABILITY_LKG_TTL_MS,
      maxEntries: 10,
    });
    await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => jsonResponse(200, INDEXABLE)),
      lkgCache: injected,
    });

    // The module-level cache saw nothing, so the shared path still fails closed.
    const fromModuleCache = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
    });
    // The injected cache did remember it.
    const fromInjectedCache = await fetchProjectIndexabilityDecision(parsed, {
      baseUrl: BASE_URL,
      fetcher: respondOnce(() => new Response("boom", { status: 500 })),
      lkgCache: injected,
    });

    expect(fromModuleCache).toEqual(FAIL_CLOSED);
    expect(fromInjectedCache).toEqual(INDEXABLE);
  });

  it("pins the TTL to five minutes", () => {
    expect(PROJECT_INDEXABILITY_LKG_TTL_MS).toBe(5 * 60 * 1000);
  });
});
