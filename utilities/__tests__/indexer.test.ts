import { INDEXER } from "../indexer";

describe("INDEXER utilities", () => {
  describe("V2.PROJECTS.LIST_PAGINATED", () => {
    it("should return base path without params", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED();
      expect(url).toBe("/v2/projects");
    });

    it("should include q param when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ q: "dao" });
      expect(url).toContain("q=dao");
    });

    it("should include page param when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ page: 2 });
      expect(url).toContain("page=2");
    });

    it("should include limit param when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ limit: 20 });
      expect(url).toContain("limit=20");
    });

    it("should include sortBy param when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ sortBy: "noOfGrants" });
      expect(url).toContain("sortBy=noOfGrants");
    });

    it("should include sortOrder param when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ sortOrder: "asc" });
      expect(url).toContain("sortOrder=asc");
    });

    it("should include includeStats param when true", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ includeStats: true });
      expect(url).toContain("includeStats=true");
    });

    it("should NOT include includeStats param when false", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ includeStats: false });
      expect(url).not.toContain("includeStats");
    });

    it("should handle all params together", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({
        q: "gitcoin",
        page: 1,
        limit: 10,
        sortBy: "updatedAt",
        sortOrder: "desc",
        includeStats: true,
      });

      expect(url).toContain("q=gitcoin");
      expect(url).toContain("page=1");
      expect(url).toContain("limit=10");
      expect(url).toContain("sortBy=updatedAt");
      expect(url).toContain("sortOrder=desc");
      expect(url).toContain("includeStats=true");
    });

    it("should start with /v2/projects", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ page: 1 });
      expect(url.startsWith("/v2/projects")).toBe(true);
    });

    it("should include ? before query params", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({ page: 1 });
      expect(url).toContain("?");
    });

    it("should not include ? when no params provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED();
      expect(url).not.toContain("?");
    });

    it("should handle empty params object", () => {
      const url = INDEXER.V2.PROJECTS.LIST_PAGINATED({});
      expect(url).toBe("/v2/projects");
    });
  });

  describe("V2.PROJECTS.LIST", () => {
    it("should return base path without limit", () => {
      const url = INDEXER.V2.PROJECTS.LIST();
      expect(url).toBe("/v2/projects");
    });

    it("should include limit when provided", () => {
      const url = INDEXER.V2.PROJECTS.LIST(20);
      expect(url).toBe("/v2/projects?limit=20");
    });
  });

  describe("V2.PROJECTS.SEARCH", () => {
    it("should include search query", () => {
      const url = INDEXER.V2.PROJECTS.SEARCH("dao");
      expect(url).toContain("q=dao");
    });

    it("should encode special characters in query", () => {
      const url = INDEXER.V2.PROJECTS.SEARCH("hello world");
      expect(url).toContain("q=hello%20world");
    });

    it("should include limit when provided", () => {
      const url = INDEXER.V2.PROJECTS.SEARCH("dao", 15);
      expect(url).toContain("limit=15");
    });
  });
});
