import { extractTrustedClientIp } from "@/utilities/client-ip";

function makeHeaders(entries: Record<string, string>): { get(name: string): string | null } {
  const headers = new Headers(entries);
  return { get: (name: string) => headers.get(name) };
}

describe("extractTrustedClientIp", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Cloudflare Workers (non-Vercel default)", () => {
    it("prefers cf-connecting-ip over spoofed x-real-ip and x-forwarded-for", () => {
      const ip = extractTrustedClientIp(
        makeHeaders({
          "cf-connecting-ip": "203.0.113.42",
          "x-real-ip": "198.51.100.99",
          "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        })
      );

      expect(ip).toBe("203.0.113.42");
    });

    it("ignores spoofed x-real-ip when cf-connecting-ip is absent and falls back to rightmost XFF", () => {
      const ip = extractTrustedClientIp(
        makeHeaders({
          "x-real-ip": "198.51.100.99",
          "x-forwarded-for": "1.2.3.4, 203.0.113.7, 70.41.3.18",
        })
      );

      expect(ip).toBe("70.41.3.18");
    });

    it("returns null when only x-real-ip is present", () => {
      const ip = extractTrustedClientIp(makeHeaders({ "x-real-ip": "198.51.100.4" }));

      expect(ip).toBeNull();
    });

    it("supports trimmed IPv4 and IPv6 addresses", () => {
      expect(extractTrustedClientIp(makeHeaders({ "cf-connecting-ip": "  2001:db8::1  " }))).toBe(
        "2001:db8::1"
      );
      expect(extractTrustedClientIp(makeHeaders({ "cf-connecting-ip": "  192.0.2.10  " }))).toBe(
        "192.0.2.10"
      );
    });

    it.each([
      ["free text", "not-an-ip"],
      ["an out-of-range octet", "999.1.1.1"],
      ["an IP with a smuggled suffix", "1.2.3.4; X-Admin: 1"],
      ["a hostname", "evil.example.com"],
      ["a CIDR range", "10.0.0.0/8"],
      ["an IP with a port", "1.2.3.4:8080"],
      ["a bracketed IPv6", "[2001:db8::1]"],
    ])("rejects %s", (_label, value) => {
      expect(extractTrustedClientIp(makeHeaders({ "cf-connecting-ip": value }))).toBeNull();
    });
  });

  describe("Vercel (VERCEL env set)", () => {
    beforeEach(() => {
      vi.stubEnv("VERCEL", "1");
    });

    it("prefers x-real-ip over spoofed cf-connecting-ip and x-forwarded-for", () => {
      const ip = extractTrustedClientIp(
        makeHeaders({
          "cf-connecting-ip": "203.0.113.42",
          "x-real-ip": "198.51.100.4",
          "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        })
      );

      expect(ip).toBe("198.51.100.4");
    });

    it("ignores spoofed cf-connecting-ip when x-real-ip is absent and falls back to rightmost XFF", () => {
      const ip = extractTrustedClientIp(
        makeHeaders({
          "cf-connecting-ip": "203.0.113.42",
          "x-forwarded-for": "1.2.3.4, 70.41.3.18",
        })
      );

      expect(ip).toBe("70.41.3.18");
    });
  });
});
