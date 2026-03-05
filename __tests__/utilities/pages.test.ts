import { PAGES } from "@/utilities/pages";

describe("PAGES constants", () => {
  describe("COMMUNITY.APPLICATION_SUCCESS", () => {
    it("returns correct path format", () => {
      const result = PAGES.COMMUNITY.APPLICATION_SUCCESS("optimism", "app-123");
      expect(result).toBe("/community/optimism/applications/app-123/success");
    });

    it("includes the community slug in the path", () => {
      const result = PAGES.COMMUNITY.APPLICATION_SUCCESS("arbitrum", "ref-456");
      expect(result).toContain("/community/arbitrum/");
    });

    it("includes the applicationId in the path", () => {
      const result = PAGES.COMMUNITY.APPLICATION_SUCCESS("celo", "REF-789");
      expect(result).toContain("REF-789");
    });

    it("ends with /success", () => {
      const result = PAGES.COMMUNITY.APPLICATION_SUCCESS("polygon", "app-001");
      expect(result.endsWith("/success")).toBe(true);
    });

    it("handles different community and applicationId values", () => {
      const path1 = PAGES.COMMUNITY.APPLICATION_SUCCESS("comm-a", "app-1");
      const path2 = PAGES.COMMUNITY.APPLICATION_SUCCESS("comm-b", "app-2");
      expect(path1).not.toBe(path2);
    });
  });

  describe("COMMUNITY.APPLICATION_DETAIL", () => {
    it("returns correct path format", () => {
      const result = PAGES.COMMUNITY.APPLICATION_DETAIL("optimism", "app-123");
      expect(result).toBe("/community/optimism/applications/app-123");
    });
  });

  describe("COMMUNITY.PROGRAM_APPLY", () => {
    it("returns correct path format", () => {
      const result = PAGES.COMMUNITY.PROGRAM_APPLY("optimism", "prog-1");
      expect(result).toBe("/community/optimism/programs/prog-1/apply");
    });
  });

  describe("COMMUNITY.ALL_GRANTS", () => {
    it("returns base path without programId", () => {
      const result = PAGES.COMMUNITY.ALL_GRANTS("optimism");
      expect(result).toBe("/community/optimism");
    });

    it("returns path with programId query param when provided", () => {
      const result = PAGES.COMMUNITY.ALL_GRANTS("optimism", "prog-1");
      expect(result).toBe("/community/optimism?programId=prog-1");
    });
  });

  describe("PAGES static routes", () => {
    it("HOME is /", () => {
      expect(PAGES.HOME).toBe("/");
    });

    it("DASHBOARD is /dashboard", () => {
      expect(PAGES.DASHBOARD).toBe("/dashboard");
    });

    it("COMMUNITIES is /communities", () => {
      expect(PAGES.COMMUNITIES).toBe("/communities");
    });
  });
});
