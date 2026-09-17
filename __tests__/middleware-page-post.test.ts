import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { CANONICAL_ORIGIN } from "@/utilities/domains";

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

const PAGE_PATH = "/community/karma-community/projects";
const BOT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AppEngine-Google; (+http://code.google.com/appengine)";

const createRequest = (
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {}
) =>
  new NextRequest(new URL(path, CANONICAL_ORIGIN), {
    method: init.method ?? "GET",
    headers: { host: new URL(CANONICAL_ORIGIN).host, ...init.headers },
    body: init.body,
  });

describe("middleware page POST guard", () => {
  describe("answers 405 without rendering", () => {
    it("rejects a url-encoded form POST from a crawler (GAP-FRONTEND-27P)", async () => {
      const response = await proxy(
        createRequest(PAGE_PATH, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": BOT_USER_AGENT,
          },
          body: "a=1",
        })
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    });

    it("rejects a POST with no content type", async () => {
      const response = await proxy(createRequest(PAGE_PATH, { method: "POST" }));

      expect(response.status).toBe(405);
    });

    it("rejects a text/plain POST", async () => {
      const response = await proxy(
        createRequest(PAGE_PATH, {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "hello",
        })
      );

      expect(response.status).toBe(405);
    });

    it("rejects a POST carrying a next-action header (GAP-FRONTEND-27R)", async () => {
      const response = await proxy(
        createRequest(PAGE_PATH, {
          method: "POST",
          headers: { "next-action": "abc123", "content-type": "text/plain;charset=UTF-8" },
          body: "[]",
        })
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    });

    it("rejects a multipart form POST (GAP-FRONTEND-27R)", async () => {
      const response = await proxy(
        createRequest(PAGE_PATH, {
          method: "POST",
          headers: { "content-type": "multipart/form-data; boundary=x" },
          body: "--x--\r\n",
        })
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    });
  });

  describe("lets through what is not a page POST", () => {
    it("passes a POST to a route handler path", async () => {
      const response = await proxy(
        createRequest("/.well-known/oauth-protected-resource", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      );

      expect(response.status).not.toBe(405);
    });

    it("passes a GET to the page", async () => {
      const response = await proxy(
        createRequest(PAGE_PATH, { headers: { "user-agent": BOT_USER_AGENT } })
      );

      expect(response.status).not.toBe(405);
      expect(response.headers.get("x-middleware-rewrite")).not.toBeNull();
    });
  });
});
