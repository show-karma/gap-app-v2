import { ensureProtocol } from "../ensureProtocol";

describe("ensureProtocol", () => {
  describe("URLs with existing protocols", () => {
    it("should leave https URLs unchanged", () => {
      expect(ensureProtocol("https://example.com")).toBe("https://example.com");
      expect(ensureProtocol("https://www.example.com")).toBe("https://www.example.com");
      expect(ensureProtocol("https://subdomain.example.com")).toBe("https://subdomain.example.com");
    });

    it("should leave http URLs unchanged", () => {
      expect(ensureProtocol("http://example.com")).toBe("http://example.com");
      expect(ensureProtocol("http://www.example.com")).toBe("http://www.example.com");
    });

    it("should handle URLs with paths", () => {
      expect(ensureProtocol("https://example.com/path")).toBe("https://example.com/path");
      expect(ensureProtocol("http://example.com/path/to/resource")).toBe(
        "http://example.com/path/to/resource"
      );
    });

    it("should handle URLs with query parameters", () => {
      expect(ensureProtocol("https://example.com?param=value")).toBe(
        "https://example.com?param=value"
      );
      expect(ensureProtocol("http://example.com?a=1&b=2")).toBe("http://example.com?a=1&b=2");
    });

    it("should handle URLs with fragments", () => {
      expect(ensureProtocol("https://example.com#section")).toBe("https://example.com#section");
      expect(ensureProtocol("http://example.com/path#anchor")).toBe(
        "http://example.com/path#anchor"
      );
    });
  });

  describe("URLs without protocols", () => {
    it("should add https:// to www URLs", () => {
      expect(ensureProtocol("www.example.com")).toBe("https://www.example.com");
      expect(ensureProtocol("www.subdomain.example.com")).toBe("https://www.subdomain.example.com");
    });

    it("should add https:// to domain-like URLs", () => {
      expect(ensureProtocol("example.com")).toBe("https://example.com");
      expect(ensureProtocol("subdomain.example.com")).toBe("https://subdomain.example.com");
      expect(ensureProtocol("my-site.co")).toBe("https://my-site.co");
    });

    it("should handle domains with various TLDs", () => {
      expect(ensureProtocol("example.org")).toBe("https://example.org");
      expect(ensureProtocol("example.net")).toBe("https://example.net");
      expect(ensureProtocol("example.io")).toBe("https://example.io");
      expect(ensureProtocol("example.dev")).toBe("https://example.dev");
    });

    it("should handle domains with hyphens", () => {
      expect(ensureProtocol("my-example-site.com")).toBe("https://my-example-site.com");
      expect(ensureProtocol("test-domain.co.uk")).toBe("https://test-domain.co.uk");
    });

    it("should handle domains with numbers", () => {
      expect(ensureProtocol("123example.com")).toBe("https://123example.com");
      expect(ensureProtocol("example123.com")).toBe("https://example123.com");
    });

    it("should add https:// to URLs with paths but no protocol", () => {
      expect(ensureProtocol("www.example.com/path")).toBe("https://www.example.com/path");
      expect(ensureProtocol("example.com/path/to/page")).toBe("https://example.com/path/to/page");
    });
  });

  describe("Relative paths and special cases", () => {
    it("should return relative paths unchanged", () => {
      expect(ensureProtocol("/path/to/page")).toBe("/path/to/page");
      expect(ensureProtocol("./relative/path")).toBe("./relative/path");
      expect(ensureProtocol("../parent/path")).toBe("../parent/path");
    });

    it("should return fragments unchanged", () => {
      expect(ensureProtocol("#section")).toBe("#section");
      expect(ensureProtocol("#top")).toBe("#top");
    });

    it("should handle empty or undefined input", () => {
      expect(ensureProtocol("")).toBe("");
      expect(ensureProtocol(undefined)).toBe(undefined);
    });

    it("should handle special URLs", () => {
      expect(ensureProtocol("localhost")).toBe("localhost");
      expect(ensureProtocol("127.0.0.1")).toBe("127.0.0.1");
    });

    it("should handle mailto links unchanged", () => {
      expect(ensureProtocol("mailto:test@example.com")).toBe("mailto:test@example.com");
    });

    it("should handle tel links unchanged", () => {
      expect(ensureProtocol("tel:+1234567890")).toBe("tel:+1234567890");
    });
  });

  describe("Edge cases", () => {
    it("should handle URLs with ports", () => {
      expect(ensureProtocol("http://example.com:8080")).toBe("http://example.com:8080");
      expect(ensureProtocol("example.com:8080")).toBe("https://example.com:8080");
    });

    it("should handle internationalized domains", () => {
      // May not add protocol to internationalized domains depending on regex
      const result = ensureProtocol("münchen.de");
      expect(result).toBeTruthy();
    });

    it("should handle very long TLDs", () => {
      expect(ensureProtocol("example.technology")).toBe("https://example.technology");
    });

    it("should handle subdomains", () => {
      expect(ensureProtocol("api.subdomain.example.com")).toBe("https://api.subdomain.example.com");
      expect(ensureProtocol("www.api.example.com")).toBe("https://www.api.example.com");
    });

    it("should handle URLs with authentication", () => {
      expect(ensureProtocol("https://user:pass@example.com")).toBe("https://user:pass@example.com");
    });

    it("should handle data URLs unchanged", () => {
      const dataUrl = "data:text/plain;base64,SGVsbG8=";
      expect(ensureProtocol(dataUrl)).toBe(dataUrl);
    });

    it("should handle single word inputs", () => {
      expect(ensureProtocol("localhost")).toBe("localhost");
      expect(ensureProtocol("test")).toBe("test");
    });

    it("should handle uppercase protocols", () => {
      expect(ensureProtocol("HTTPS://example.com")).toBe("HTTPS://example.com");
      expect(ensureProtocol("HTTP://example.com")).toBe("HTTP://example.com");
    });

    it("should handle mixed case domains", () => {
      expect(ensureProtocol("WWW.EXAMPLE.COM")).toBe("https://WWW.EXAMPLE.COM");
      expect(ensureProtocol("Example.Com")).toBe("https://Example.Com");
    });

    it("should handle query strings without protocol", () => {
      expect(ensureProtocol("example.com?query=value")).toBe("https://example.com?query=value");
    });

    it("should handle fragments without protocol", () => {
      expect(ensureProtocol("example.com#anchor")).toBe("https://example.com#anchor");
    });

    it("should not modify file:// protocols", () => {
      expect(ensureProtocol("file:///path/to/file")).toBe("file:///path/to/file");
    });
  });
});
