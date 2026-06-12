import { APP_ROUTE_TEMPLATES } from "@/utilities/appRouteTemplates";

describe("APP_ROUTE_TEMPLATES", () => {
  it("is comprehensive — derived by walking the whole PAGES tree", () => {
    // A representative spread across the route families that were previously
    // missing when the list was hand-curated.
    expect(APP_ROUTE_TEMPLATES).toContain("/my-reviews");
    expect(APP_ROUTE_TEMPLATES).toContain("/my-projects");
    expect(APP_ROUTE_TEMPLATES).toContain("/project/:project");
    expect(APP_ROUTE_TEMPLATES).toContain("/project/:project/funding/:grant");
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:community");
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:community/applications/:applicationId");
    expect(APP_ROUTE_TEMPLATES).toContain(
      "/community/:community/manage/funding-platform/:programId/applications"
    );
    expect(APP_ROUTE_TEMPLATES).toContain(
      "/community/:community/manage/funding-platform/:programId/milestones/:projectId"
    );
    // It should be large — the whole PAGES tree, not a hand-picked subset.
    expect(APP_ROUTE_TEMPLATES.length).toBeGreaterThan(50);
  });

  it("emits the base path AND the deep-link variant for optional-param routes", () => {
    // Optional params (e.g. the milestone anchor, the `?programId=` filter)
    // must not eat the base path.
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:community");
    expect(APP_ROUTE_TEMPLATES.some((t) => t.includes("#milestone-:milestoneUid"))).toBe(true);
  });

  it("contains only valid root-relative paths and no unresolved params", () => {
    for (const template of APP_ROUTE_TEMPLATES) {
      expect(template.startsWith("/")).toBe(true);
      expect(template).not.toContain("undefined");
    }
  });

  it("contains no duplicate templates", () => {
    expect(new Set(APP_ROUTE_TEMPLATES).size).toBe(APP_ROUTE_TEMPLATES.length);
  });
});
