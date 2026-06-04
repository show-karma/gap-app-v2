import { APP_ROUTE_TEMPLATES } from "@/utilities/appRouteTemplates";

describe("APP_ROUTE_TEMPLATES", () => {
  it("includes the core entity route templates with :param placeholders", () => {
    expect(APP_ROUTE_TEMPLATES).toContain("/project/:projectSlug");
    expect(APP_ROUTE_TEMPLATES).toContain("/project/:projectSlug/funding/:grantUID");
    expect(APP_ROUTE_TEMPLATES).toContain(
      "/project/:projectSlug/funding/:grantUID/milestones-and-updates"
    );
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:communitySlug");
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:communitySlug/programs/:programId");
    expect(APP_ROUTE_TEMPLATES).toContain("/community/:communitySlug/applications/:applicationId");
    expect(APP_ROUTE_TEMPLATES).toContain(
      "/community/:communitySlug/manage/funding-platform/:programId/milestones/:projectUID"
    );
    expect(APP_ROUTE_TEMPLATES).toContain("/my-reviews");
  });

  it("derives every template from PAGES as a root-relative path", () => {
    for (const template of APP_ROUTE_TEMPLATES) {
      expect(template.startsWith("/")).toBe(true);
    }
  });

  it("contains no duplicate templates", () => {
    expect(new Set(APP_ROUTE_TEMPLATES).size).toBe(APP_ROUTE_TEMPLATES.length);
  });
});
