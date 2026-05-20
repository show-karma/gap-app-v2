import { describe, expect, it } from "vitest";
import { buildSitemapEntries, formatSitemapLastmod } from "@/utilities/sitemap";

describe("formatSitemapLastmod", () => {
  it("strips fractional seconds from ISO timestamps (Google parser strictness)", () => {
    const fixed = new Date("2026-05-20T14:43:55.227Z");
    expect(formatSitemapLastmod(fixed)).toBe("2026-05-20T14:43:55Z");
  });

  it("leaves whole-second timestamps unchanged", () => {
    const fixed = new Date("2026-05-20T14:43:55.000Z");
    expect(formatSitemapLastmod(fixed)).toBe("2026-05-20T14:43:55Z");
  });

  it("defaults to now with second precision", () => {
    expect(formatSitemapLastmod()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe("buildSitemapEntries", () => {
  it("emits lastModified without fractional seconds for every entry", () => {
    const entries = buildSitemapEntries(["https://www.karmahq.xyz/project/a"], {
      priority: 0.8,
      changeFrequency: "daily",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(entries[0].lastModified).not.toMatch(/\.\d{3}Z$/);
  });
});
