import { buildConfigSlug, deriveConfigSlugs } from "@/utilities/portfolio-reports/config-slug";

describe("config slug derivation", () => {
  it("slugifies names and falls back to 'report' for empty results", () => {
    expect(buildConfigSlug("Bi-Weekly Check-In (Agent)")).toBe("bi-weekly-check-in-agent");
    expect(buildConfigSlug("  ")).toBe("report");
  });

  it("suffixes collisions in creation order", () => {
    const slugs = deriveConfigSlugs([
      { id: "b", name: "Summary", createdAt: "2026-05-01T00:00:00.000Z" },
      { id: "a", name: "Summary", createdAt: "2026-04-01T00:00:00.000Z" },
      { id: "c", name: "summary", createdAt: "2026-06-01T00:00:00.000Z" },
    ]);

    expect(slugs.get("a")).toBe("summary");
    expect(slugs.get("b")).toBe("summary-2");
    expect(slugs.get("c")).toBe("summary-3");
  });
});
