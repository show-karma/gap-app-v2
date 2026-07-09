/**
 * @file Regression tests for the img-proxy SSRF guard (app/api/img-proxy/route.ts).
 * Locks the IPv6 SSRF bypass fix: hostnames like `[fe80::1]` (link-local),
 * `[fd00::1]` (unique-local), and IPv4-mapped IPv6 addresses (`[::ffff:127.0.0.1]`,
 * `[::ffff:7f00:1]`) must be blocked exactly like their IPv4 equivalents. Also
 * covers the pre-existing IPv4/hostname blocklist, disallowed schemes, missing
 * `url` param, and the post-redirect re-validation that catches a public URL
 * 302-ing to an internal host.
 */

import { GET } from "@/app/api/img-proxy/route";

function makeRequest(target: string): Request {
  return new Request(`http://localhost/api/img-proxy?url=${encodeURIComponent(target)}`);
}

describe("GET /api/img-proxy", () => {
  it("returns 400 'No URL provided' when the url query param is missing", async () => {
    const res = await GET(new Request("http://localhost/api/img-proxy"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "No URL provided" });
  });

  describe("blocked hosts (short-circuit before fetch)", () => {
    const blocked: Array<[string, string]> = [
      ["http://127.0.0.1/x", "IPv4 loopback"],
      ["http://169.254.169.254/latest/meta-data", "IPv4 link-local / cloud metadata"],
      ["http://10.0.0.5/x", "IPv4 RFC-1918 10.0.0.0/8"],
      ["http://192.168.1.1/x", "IPv4 RFC-1918 192.168.0.0/16"],
      ["http://172.16.0.1/x", "IPv4 RFC-1918 172.16.0.0/12"],
      ["http://0.0.0.0/x", "IPv4 'this' network"],
      ["http://100.64.0.1/x", "IPv4 CGNAT 100.64.0.0/10"],
      ["http://localhost/x", "localhost hostname"],
      ["http://foo.local/x", ".local hostname"],
      ["http://[::1]/x", "IPv6 loopback"],
      ["http://[fe80::1]/x", "IPv6 link-local (core regression)"],
      ["http://[fd00::1]/x", "IPv6 unique-local"],
      ["http://[::ffff:127.0.0.1]/x", "IPv4-mapped IPv6, dotted form (=127.0.0.1)"],
      ["http://[::ffff:7f00:1]/x", "IPv4-mapped IPv6, hex form (=127.0.0.1)"],
      [
        "http://[::ffff:a9fe:a9fe]/x",
        "IPv4-mapped IPv6, hex form (=169.254.169.254 cloud metadata)",
      ],
      ["http://2130706433/x", "decimal IPv4 (=127.0.0.1)"],
      ["http://0x7f000001/x", "hex IPv4 (=127.0.0.1)"],
    ];

    it.each(blocked)("blocks %s (%s) with 400 before calling fetch", async (target) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const res = await GET(makeRequest(target));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "URL not allowed" });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe("disallowed schemes", () => {
    it("blocks ftp:// with 400", async () => {
      const res = await GET(makeRequest("ftp://example.com/x"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("URL not allowed");
    });

    it("blocks data: URLs with 400", async () => {
      const res = await GET(makeRequest("data:image/png;base64,xxx"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(["URL not allowed", "Invalid URL"]).toContain(body.error);
    });
  });

  describe("allowed hosts", () => {
    const allowed = [
      "https://cdn.example.com/a.png",
      "https://images.githubusercontent.com/a.png",
      "https://www.httparchive.org/a.png",
    ];

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it.each(allowed)("proxies %s and echoes the image content-type", async (target) => {
      const buffer = new TextEncoder().encode("fake-image-bytes").buffer;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          url: target,
          headers: { get: (key: string) => (key === "Content-Type" ? "image/png" : null) },
          arrayBuffer: async () => buffer,
        })
      );

      const res = await GET(makeRequest(target));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
    });

    it("returns 400 'URL is not an image' when the upstream response isn't an image", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          url: allowed[0],
          headers: { get: (key: string) => (key === "Content-Type" ? "text/html" : null) },
          arrayBuffer: async () => new ArrayBuffer(0),
        })
      );

      const res = await GET(makeRequest(allowed[0]));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("URL is not an image");
    });

    it("re-validates the post-redirect URL and blocks a redirect to an internal host", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          // Upstream 302'd from a public URL to the cloud metadata endpoint.
          url: "http://169.254.169.254/",
          headers: { get: (key: string) => (key === "Content-Type" ? "image/png" : null) },
          arrayBuffer: async () => new ArrayBuffer(0),
        })
      );

      const res = await GET(makeRequest(allowed[0]));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("URL not allowed");
    });
  });
});
