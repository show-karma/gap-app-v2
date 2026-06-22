/**
 * @file Tests for the Next.js API-route proxy on the FE origin that
 * forwards donor-shared comment reads and writes to the indexer (KTD13).
 * Validates header forwarding (x-forwarded-for, x-drsc-session, Origin,
 * Idempotency-Key), Set-Cookie translation onto the FE origin, and the
 * unreachable-indexer fallback.
 */

import type { NextRequest } from "next/server";

const cookieStore = {
  get: vi.fn(),
};

const headerStore = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
  headers: vi.fn(async () => headerStore),
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://indexer.test",
  },
}));

import { GET, POST } from "@/app/api/donor-research/shared/[token]/comments/route";

function makeRequest(
  url = "http://localhost/api/donor-research/shared/tk/comments",
  init?: { body?: string }
): NextRequest {
  return {
    url,
    text: async () => init?.body ?? "",
  } as unknown as NextRequest;
}

function ctx() {
  return { params: Promise.resolve({ token: "share-tk" }) };
}

function fetchResponse(opts: { status?: number; body?: unknown; setCookies?: string[] } = {}) {
  const headers = new Headers();
  if (opts.setCookies) {
    for (const c of opts.setCookies) headers.append("set-cookie", c);
  }
  // The route's copySetCookies reads getSetCookie(); polyfill on the Response.
  return {
    status: opts.status ?? 200,
    headers: {
      getSetCookie: () => opts.setCookies ?? [],
      get: (k: string) => headers.get(k),
    },
    json: async () => opts.body ?? {},
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReset();
  headerStore.get.mockReset();
});

describe("GET /api/donor-research/shared/[token]/comments", () => {
  it("forwards x-forwarded-for, x-drsc-session, and Origin to the indexer", async () => {
    headerStore.get.mockImplementation((k: string) => {
      if (k === "x-forwarded-for") return "1.2.3.4, 5.6.7.8";
      if (k === "origin") return "http://localhost:3000";
      return null;
    });
    cookieStore.get.mockImplementation((name: string) =>
      name === "drsc_session" ? { value: "cookie-payload" } : undefined
    );
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(fetchResponse({ status: 200, body: { roots: [] } }));

    const res = await GET(
      makeRequest("http://localhost/api/donor-research/shared/tk/comments?cursor=abc&limit=10"),
      ctx()
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toContain(
      "http://indexer.test/v2/donor-research/shared/share-tk/comments"
    );
    expect(String(calledUrl)).toContain("cursor=abc");
    expect(String(calledUrl)).toContain("limit=10");
    const h = options?.headers as Record<string, string>;
    expect(h["x-forwarded-for"]).toBe("1.2.3.4");
    expect(h["x-drsc-session"]).toBe("cookie-payload");
    expect(h["Origin"]).toBe("http://localhost:3000");
    expect(res.status).toBe(200);
  });

  it("forwards the Authorization header so the indexer can resolve the advisor branch", async () => {
    headerStore.get.mockImplementation((k: string) => {
      if (k === "authorization") return "Bearer privy-jwt-xyz";
      return null;
    });
    cookieStore.get.mockReturnValue(undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(fetchResponse({ status: 200, body: { roots: [] } }));

    await GET(makeRequest(), ctx());

    const [, options] = fetchSpy.mock.calls[0];
    const h = options?.headers as Record<string, string>;
    expect(h["Authorization"]).toBe("Bearer privy-jwt-xyz");
  });

  it("returns 502 when the indexer is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(makeRequest(), ctx());
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({ error: "indexer_unreachable" });
  });

  it("translates Set-Cookie from indexer onto the FE origin with the proxy path", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fetchResponse({
        status: 200,
        body: {},
        setCookies: ["drsc_session=abc123", "drsc_name=Dana"],
      })
    );
    const res = await GET(makeRequest(), ctx());
    // NextResponse emits one Set-Cookie header per cookie; use the
    // multi-value accessor so we read every entry, not just the last.
    const setCookies = res.headers.getSetCookie();
    const sessionSegment = setCookies.find((s) => s.startsWith("drsc_session=")) ?? "";
    const nameSegment = setCookies.find((s) => s.startsWith("drsc_name=")) ?? "";
    expect(sessionSegment).toContain("drsc_session=abc123");
    expect(sessionSegment).toContain("Path=/api/donor-research/shared/");
    expect(nameSegment).toContain("drsc_name=Dana");
    expect(nameSegment).toContain("Path=/api/donor-research/shared/");
    // drsc_session must remain HttpOnly; drsc_name must NOT be HttpOnly.
    expect(sessionSegment.toLowerCase()).toContain("httponly");
    expect(nameSegment.toLowerCase()).not.toContain("httponly");
  });

  it("includes no-store cache headers on success and error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(fetchResponse({ status: 200, body: {} }));
    const res = await GET(makeRequest(), ctx());
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});

describe("POST /api/donor-research/shared/[token]/comments", () => {
  it("passes through the Idempotency-Key header", async () => {
    headerStore.get.mockImplementation((k: string) => {
      if (k === "idempotency-key") return "client-uuid";
      return null;
    });
    cookieStore.get.mockReturnValue(undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(fetchResponse({ status: 201, body: { id: "c1" } }));

    const res = await POST(makeRequest(undefined, { body: '{"body":"hi"}' }), ctx());

    expect(res.status).toBe(201);
    const [, options] = fetchSpy.mock.calls[0];
    const h = options?.headers as Record<string, string>;
    expect(h["Idempotency-Key"]).toBe("client-uuid");
    expect(h["Content-Type"]).toBe("application/json");
    expect(options?.body).toBe('{"body":"hi"}');
  });

  it("returns 502 when the indexer is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const res = await POST(makeRequest(undefined, { body: "{}" }), ctx());
    expect(res.status).toBe(502);
  });

  it("propagates non-2xx status from the indexer (e.g., 429)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      fetchResponse({ status: 429, body: { error: "rate_limited" } })
    );
    const res = await POST(makeRequest(undefined, { body: "{}" }), ctx());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("rate_limited");
  });
});
