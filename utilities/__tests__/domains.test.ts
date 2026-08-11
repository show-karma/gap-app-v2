import {
  ALIAS_HOSTS,
  appOrigin,
  bareHostname,
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  canonicalUrl,
  docsOrigin,
  isAliasHost,
  STAGING_ORIGIN,
} from "../domains";

describe("domains", () => {
  describe("ALIAS_HOSTS", () => {
    it("should contain exactly the five legacy and non-canonical hosts", () => {
      expect([...ALIAS_HOSTS].sort()).toEqual(
        [
          "gap.karmahq.org",
          "gap.karmahq.xyz",
          "karmahq.org",
          "karmahq.xyz",
          "www.karmahq.xyz",
        ].sort()
      );
    });

    it("should NOT contain the canonical host (redirect-loop regression)", () => {
      expect(ALIAS_HOSTS.has(CANONICAL_HOST)).toBe(false);
    });
  });

  describe("isAliasHost", () => {
    it("should be false for the canonical host", () => {
      expect(isAliasHost("www.karmahq.org")).toBe(false);
    });

    it("should be true for the legacy canonical host", () => {
      expect(isAliasHost("www.karmahq.xyz")).toBe(true);
    });

    it("should be true for the legacy apex", () => {
      expect(isAliasHost("karmahq.xyz")).toBe(true);
    });

    it("should be true for the legacy gap subdomain", () => {
      expect(isAliasHost("gap.karmahq.xyz")).toBe(true);
    });

    it("should be true for the new apex", () => {
      expect(isAliasHost("karmahq.org")).toBe(true);
    });

    it("should normalize before matching", () => {
      expect(isAliasHost("KARMAHQ.XYZ:443")).toBe(true);
      expect(isAliasHost("karmahq.xyz.")).toBe(true);
      expect(isAliasHost("WWW.KARMAHQ.ORG.")).toBe(false);
    });

    it("should be false for unrelated and lookalike hosts", () => {
      expect(isAliasHost("staging.karmahq.org")).toBe(false);
      expect(isAliasHost("app.opgrants.io")).toBe(false);
      expect(isAliasHost("karmahq.xyz.evil.com")).toBe(false);
      expect(isAliasHost("fakekarmahq.xyz")).toBe(false);
    });
  });

  describe("bareHostname", () => {
    it("should strip the port", () => {
      expect(bareHostname("localhost:3000")).toBe("localhost");
      expect(bareHostname("karmahq.org:443")).toBe("karmahq.org");
    });

    it("should lower-case", () => {
      expect(bareHostname("WWW.KarmaHQ.Org")).toBe("www.karmahq.org");
    });

    it("should drop a single trailing DNS dot", () => {
      expect(bareHostname("karmahq.org.")).toBe("karmahq.org");
      expect(bareHostname("karmahq.org..")).toBe("karmahq.org.");
    });

    it("should leave an already-bare hostname unchanged", () => {
      expect(bareHostname("www.karmahq.org")).toBe("www.karmahq.org");
    });
  });

  describe("appOrigin", () => {
    const originalEnv = process.env.NEXT_PUBLIC_ENV;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_ENV;
      } else {
        process.env.NEXT_PUBLIC_ENV = originalEnv;
      }
    });

    it("should return the canonical origin in production", () => {
      process.env.NEXT_PUBLIC_ENV = "production";
      expect(appOrigin()).toBe(CANONICAL_ORIGIN);
    });

    it("should return the staging origin in staging", () => {
      process.env.NEXT_PUBLIC_ENV = "staging";
      expect(appOrigin()).toBe(STAGING_ORIGIN);
    });

    it("should return the staging origin when the env is unset", () => {
      delete process.env.NEXT_PUBLIC_ENV;
      expect(appOrigin()).toBe(STAGING_ORIGIN);
    });

    it("should not treat the legacy 'dev' value as production", () => {
      process.env.NEXT_PUBLIC_ENV = "dev";
      expect(appOrigin()).toBe(STAGING_ORIGIN);
    });
  });

  describe("docsOrigin", () => {
    const originalDocsOrigin = process.env.NEXT_PUBLIC_DOCS_ORIGIN;

    afterEach(() => {
      if (originalDocsOrigin === undefined) {
        delete process.env.NEXT_PUBLIC_DOCS_ORIGIN;
      } else {
        process.env.NEXT_PUBLIC_DOCS_ORIGIN = originalDocsOrigin;
      }
    });

    it("should default to the GitBook host when unset", () => {
      delete process.env.NEXT_PUBLIC_DOCS_ORIGIN;
      expect(docsOrigin()).toBe("https://docs.gap.karmahq.xyz");
    });

    it("should fall back to the default for an empty or whitespace override", () => {
      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "   ";
      expect(docsOrigin()).toBe("https://docs.gap.karmahq.xyz");
    });

    // A schemeless value resolves as a relative path in an href and 404s
    // against our own origin, so it must never be returned as-is.
    it("should add https to a schemeless override", () => {
      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "docs.example.com";
      expect(docsOrigin()).toBe("https://docs.example.com");
    });

    it("should preserve an override that already has a scheme", () => {
      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "http://localhost:4000";
      expect(docsOrigin()).toBe("http://localhost:4000");
    });

    it("should strip a trailing slash so callers can append paths", () => {
      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "https://docs.example.com/";
      expect(docsOrigin()).toBe("https://docs.example.com");
    });

    it("should fall back to the default for a hostless override", () => {
      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "///";
      expect(docsOrigin()).toBe("https://docs.gap.karmahq.xyz");

      process.env.NEXT_PUBLIC_DOCS_ORIGIN = "https://";
      expect(docsOrigin()).toBe("https://docs.gap.karmahq.xyz");
    });

    it("should always return something an href can use verbatim", () => {
      for (const value of [
        "docs.example.com",
        "https://docs.example.com/",
        "   ",
        "///",
        "https://",
      ]) {
        process.env.NEXT_PUBLIC_DOCS_ORIGIN = value;
        expect(docsOrigin()).toMatch(/^https?:\/\/[^/]+/);
      }
    });
  });

  describe("canonicalUrl", () => {
    it("should build a canonical target from path and search", () => {
      expect(canonicalUrl("/project/abc", "?tab=grants")).toBe(
        "https://www.karmahq.org/project/abc?tab=grants"
      );
    });

    it("should handle an empty search string", () => {
      expect(canonicalUrl("/", "")).toBe("https://www.karmahq.org/");
    });
  });
});
