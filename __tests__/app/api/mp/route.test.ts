/**
 * @file Tests for the same-origin Mixpanel proxy (app/api/mp/[...path]/route.ts).
 *
 * The proxy is the one piece of this feature reachable by anyone on the
 * internet, so the tests are weighted towards what stops it becoming an open
 * forwarder into our Mixpanel project: the POST-only ingestion-path allowlist,
 * the content-type and body-size limits, and the project-token pin on every
 * decoded record. The rest covers the header forwarding that keeps Mixpanel's
 * geolocation on the real visitor and the bounded upstream call.
 */

import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import * as route from "@/app/api/mp/[...path]/route";

const { POST } = route;

const MIXPANEL_TIMEOUT_MS = 10_000;
const TOKEN = "test-project-token";
const FORM = "application/x-www-form-urlencoded";

const base64 = (value: string) => Buffer.from(value, "utf-8").toString("base64");

const trackRecord = (token = TOKEN) => ({
  event: "login_completed",
  properties: { token, distinct_id: "did:privy:alice" },
});

const engageRecord = (token = TOKEN) => ({ $token: token, $distinct_id: "did:privy:alice" });

/** The default shape `mixpanel-browser` posts: `data=<base64 JSON>`. */
const formBody = (payload: unknown) =>
  new URLSearchParams({ data: base64(JSON.stringify(payload)) }).toString();

function makeRequest(
  init: { url?: string; headers?: Record<string, string>; body?: string } = {}
): NextRequest {
  return {
    url: init.url ?? "http://localhost/api/mp/track",
    headers: new Headers({ "content-type": FORM, ...init.headers }),
    text: async () => init.body ?? formBody([trackRecord()]),
  } as unknown as NextRequest;
}

function ctx(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function upstreamResponse(opts: { status?: number; body?: string; contentType?: string } = {}) {
  return {
    status: opts.status ?? 200,
    headers: new Headers({ "content-type": opts.contentType ?? "application/json" }),
    text: async () => opts.body ?? "1",
  } as unknown as Response;
}

const fetchArgs = (spy: ReturnType<typeof vi.spyOn>) => ({
  url: spy.mock.calls[0][0] as string,
  init: spy.mock.calls[0][1] as RequestInit,
});

const forwardedHeaders = (spy: ReturnType<typeof vi.spyOn>) =>
  fetchArgs(spy).init.headers as Record<string, string>;

describe("POST /api/mp/[...path]", () => {
  const originalEnv = process.env;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_MIXPANEL_KEY: TOKEN };
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(upstreamResponse());
  });

  afterEach(() => {
    process.env = originalEnv;
    fetchSpy.mockRestore();
  });

  it("exposes no GET handler — ingestion is POST only", () => {
    expect("GET" in route).toBe(false);
  });

  describe("path allowlist", () => {
    it("forwards the track endpoint", async () => {
      const res = await POST(makeRequest(), ctx(["track"]));

      expect(res.status).toBe(200);
      expect(fetchArgs(fetchSpy).url).toContain("https://api.mixpanel.com/track?");
    });

    it.each([
      ["engage", engageRecord()],
      ["groups", engageRecord()],
    ])("forwards the %s endpoint", async (segment, record) => {
      const res = await POST(makeRequest({ body: formBody([record]) }), ctx([segment]));

      expect(res.status).toBe(200);
      expect(fetchArgs(fetchSpy).url).toContain(`https://api.mixpanel.com/${segment}?`);
    });

    it.each([
      ["decide (feature flags, disabled on the client)", ["decide"]],
      ["record (session replay, disabled on the client)", ["record"]],
      ["import (server-side ingestion, takes a secret)", ["import"]],
      ["a nested admin path", ["api", "2.0", "engage"]],
      ["a traversal attempt", ["track", "..", "import"]],
      ["an empty path", []],
    ])("rejects %s with 404 before calling fetch", async (_label, path) => {
      const res = await POST(makeRequest(), ctx(path as string[]));

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Path not allowed" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("request limits", () => {
    it.each([["text/plain"], ["multipart/form-data; boundary=x"], [""]])(
      "rejects content-type %s with 415",
      async (contentType) => {
        const res = await POST(
          makeRequest({ headers: { "content-type": contentType } }),
          ctx(["track"])
        );

        expect(res.status).toBe(415);
        expect(fetchSpy).not.toHaveBeenCalled();
      }
    );

    it("accepts a JSON body", async () => {
      const res = await POST(
        makeRequest({
          headers: { "content-type": "application/json" },
          body: JSON.stringify([trackRecord()]),
        }),
        ctx(["track"])
      );

      expect(res.status).toBe(200);
    });

    it("rejects a body over 256 KB with 413", async () => {
      const oversized = `data=${"x".repeat(256 * 1024 + 1)}`;
      const res = await POST(makeRequest({ body: oversized }), ctx(["track"]));

      expect(res.status).toBe(413);
      await expect(res.json()).resolves.toEqual({ error: "Payload too large" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("project-token pin", () => {
    it("accepts a payload whose records all carry this project's token", async () => {
      const res = await POST(
        makeRequest({ body: formBody([trackRecord(), trackRecord()]) }),
        ctx(["track"])
      );

      expect(res.status).toBe(200);
    });

    it("accepts a single record rather than an array", async () => {
      const res = await POST(makeRequest({ body: formBody(trackRecord()) }), ctx(["track"]));

      expect(res.status).toBe(200);
    });

    it("accepts the plain-JSON `data` form as well as base64", async () => {
      const body = new URLSearchParams({ data: JSON.stringify([trackRecord()]) }).toString();
      const res = await POST(makeRequest({ body }), ctx(["track"]));

      expect(res.status).toBe(200);
    });

    it.each([
      ["another project's token", formBody([trackRecord("someone-elses-token")])],
      ["no token at all", formBody([{ event: "x", properties: {} }])],
      ["one bad record among good ones", formBody([trackRecord(), trackRecord("other")])],
      ["an unparseable payload", "data=not-json-at-all"],
      ["an empty payload", ""],
      ["a non-object record", formBody(["just a string"])],
      ["an empty array", formBody([])],
    ])("rejects %s with 403 before calling fetch", async (_label, body) => {
      const res = await POST(makeRequest({ body }), ctx(["track"]));

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({ error: "Payload rejected" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("reads the token from $token on engage rather than from properties", async () => {
      const wrongShape = await POST(
        makeRequest({ body: formBody([trackRecord()]) }),
        ctx(["engage"])
      );
      expect(wrongShape.status).toBe(403);

      const rightShape = await POST(
        makeRequest({ body: formBody([engageRecord()]) }),
        ctx(["engage"])
      );
      expect(rightShape.status).toBe(200);
    });

    it("rejects everything when the deployment has no Mixpanel token configured", async () => {
      delete process.env.NEXT_PUBLIC_MIXPANEL_KEY;

      const res = await POST(makeRequest(), ctx(["track"]));

      expect(res.status).toBe(403);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("client IP forwarding", () => {
    it("prefers the platform-set x-real-ip", async () => {
      await POST(
        makeRequest({
          headers: { "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        }),
        ctx(["track"])
      );

      expect(forwardedHeaders(fetchSpy)["X-REAL-IP"]).toBe("198.51.100.4");
    });

    it("falls back to the RIGHTMOST x-forwarded-for entry, which a client cannot forge", async () => {
      await POST(
        makeRequest({ headers: { "x-forwarded-for": "9.9.9.9, 203.0.113.7, 70.41.3.18" } }),
        ctx(["track"])
      );

      expect(forwardedHeaders(fetchSpy)["X-REAL-IP"]).toBe("70.41.3.18");
    });

    it("forwards an IPv6 address", async () => {
      await POST(makeRequest({ headers: { "x-real-ip": "2001:db8::1" } }), ctx(["track"]));

      expect(forwardedHeaders(fetchSpy)["X-REAL-IP"]).toBe("2001:db8::1");
    });

    it.each([
      ["free text", "not-an-ip"],
      ["an out-of-range octet", "999.1.1.1"],
      ["an IP with a smuggled suffix", "1.2.3.4; X-Admin: 1"],
      ["a hostname", "evil.example.com"],
    ])("drops %s rather than forwarding it", async (_label, value) => {
      await POST(makeRequest({ headers: { "x-real-ip": value } }), ctx(["track"]));

      expect(forwardedHeaders(fetchSpy)).not.toHaveProperty("X-REAL-IP");
    });

    it("omits the header when no IP header is present", async () => {
      await POST(makeRequest(), ctx(["track"]));

      expect(forwardedHeaders(fetchSpy)).not.toHaveProperty("X-REAL-IP");
    });
  });

  describe("upstream call", () => {
    it("asks Mixpanel to geolocate from the request", async () => {
      await POST(makeRequest(), ctx(["track"]));

      expect(new URL(fetchArgs(fetchSpy).url).searchParams.get("ip")).toBe("1");
    });

    it("preserves the SDK's own query parameters", async () => {
      await POST(makeRequest({ url: "http://localhost/api/mp/track?verbose=1" }), ctx(["track"]));

      expect(new URL(fetchArgs(fetchSpy).url).searchParams.get("verbose")).toBe("1");
    });

    it("forwards the body and content-type", async () => {
      const body = formBody([trackRecord()]);
      await POST(makeRequest({ body }), ctx(["track"]));

      const { init } = fetchArgs(fetchSpy);
      expect(init.method).toBe("POST");
      expect(init.body).toBe(body);
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(FORM);
    });

    it("bounds the call with a 10s timeout signal", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

      await POST(makeRequest(), ctx(["track"]));

      expect(timeoutSpy).toHaveBeenCalledWith(MIXPANEL_TIMEOUT_MS);
      expect(fetchArgs(fetchSpy).init.signal).toBeDefined();
      timeoutSpy.mockRestore();
    });

    it("returns the upstream status and body verbatim", async () => {
      fetchSpy.mockResolvedValue(
        upstreamResponse({ status: 400, body: '{"error":"bad data"}', contentType: "text/plain" })
      );

      const res = await POST(makeRequest(), ctx(["track"]));

      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toBe("text/plain");
      await expect(res.text()).resolves.toBe('{"error":"bad data"}');
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("returns 502 and reports to Sentry when Mixpanel is unreachable", async () => {
      const networkError = new Error("fetch failed");
      fetchSpy.mockRejectedValue(networkError);

      const res = await POST(makeRequest(), ctx(["track"]));

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({ error: "Upstream unavailable" });
      expect(Sentry.captureException).toHaveBeenCalledWith(networkError, {
        tags: { route: "api/mp", mixpanel_path: "track" },
      });
    });
  });
});
