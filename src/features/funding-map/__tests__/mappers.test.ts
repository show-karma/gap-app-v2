import { buildQueryString } from "../utils/mappers";

describe("buildQueryString", () => {
  describe("pagination parameters", () => {
    it("should build query string with page parameter", () => {
      const result = buildQueryString({ page: 2 });
      expect(result).toBe("?page=2");
    });

    it("should build query string with pageSize as limit", () => {
      const result = buildQueryString({ pageSize: 20 });
      expect(result).toBe("?limit=20");
    });

    it("should build query string with both page and pageSize", () => {
      const result = buildQueryString({ page: 3, pageSize: 15 });
      expect(result).toContain("page=3");
      expect(result).toContain("limit=15");
    });
  });

  describe("search parameter", () => {
    it("should build query string with search as name parameter", () => {
      const result = buildQueryString({ search: "optimism" });
      expect(result).toBe("?name=optimism");
    });

    it("should handle search with spaces", () => {
      const result = buildQueryString({ search: "optimism grants" });
      expect(result).toContain("name=optimism");
    });

    it("should not include search if empty string", () => {
      const result = buildQueryString({ search: "" });
      expect(result).toBe("");
    });
  });

  describe("status parameter", () => {
    it("should build query string with status lowercased", () => {
      const result = buildQueryString({ status: "Active" });
      expect(result).toBe("?status=active");
    });

    it("should handle inactive status lowercased", () => {
      const result = buildQueryString({ status: "Inactive" });
      expect(result).toBe("?status=inactive");
    });

    it("should handle already lowercase status", () => {
      const result = buildQueryString({ status: "active" });
      expect(result).toBe("?status=active");
    });
  });

  describe("array parameters", () => {
    it("should build query string with categories as comma-separated", () => {
      const result = buildQueryString({ categories: ["DeFi", "NFT"] });
      expect(result).toBe("?categories=DeFi%2CNFT");
    });

    it("should build query string with ecosystems as comma-separated", () => {
      const result = buildQueryString({ ecosystems: ["Optimism", "Arbitrum"] });
      expect(result).toBe("?ecosystems=Optimism%2CArbitrum");
    });

    it("should build query string with networks as comma-separated", () => {
      const result = buildQueryString({ networks: ["Ethereum", "Polygon"] });
      expect(result).toBe("?networks=Ethereum%2CPolygon");
    });

    it("should build query string with grantTypes as comma-separated", () => {
      const result = buildQueryString({ grantTypes: ["Direct Funding", "Retroactive"] });
      expect(result).toBe("?grantTypes=Direct+Funding%2CRetroactive");
    });

    it("should not include empty arrays", () => {
      const result = buildQueryString({ categories: [] });
      expect(result).toBe("");
    });

    it("should handle single item arrays", () => {
      const result = buildQueryString({ categories: ["DeFi"] });
      expect(result).toBe("?categories=DeFi");
    });
  });

  describe("combined parameters", () => {
    it("should build query string with all parameters", () => {
      const result = buildQueryString({
        page: 2,
        pageSize: 12,
        search: "grants",
        status: "active",
        categories: ["DeFi"],
        ecosystems: ["Optimism"],
        networks: ["Ethereum"],
        grantTypes: ["Direct Funding"],
      });

      expect(result).toContain("page=2");
      expect(result).toContain("limit=12");
      expect(result).toContain("name=grants");
      expect(result).toContain("status=active");
      expect(result).toContain("categories=DeFi");
      expect(result).toContain("ecosystems=Optimism");
      expect(result).toContain("networks=Ethereum");
      expect(result).toContain("grantTypes=Direct");
    });

    it("should return empty string when no params provided", () => {
      const result = buildQueryString({});
      expect(result).toBe("");
    });

    it("should skip undefined parameters", () => {
      const result = buildQueryString({
        page: 1,
        search: undefined,
        status: undefined,
      });
      expect(result).toBe("?page=1");
    });
  });

  describe("edge cases", () => {
    it("should handle page 0 (falsy but valid)", () => {
      const result = buildQueryString({ page: 0 });
      // page 0 is falsy so won't be included
      expect(result).toBe("");
    });

    it("should handle special characters in search", () => {
      const result = buildQueryString({ search: "test&value" });
      expect(result).toContain("name=test");
    });

    it("should handle categories with special characters", () => {
      const result = buildQueryString({ categories: ["AI/ML", "Web3"] });
      expect(result).toContain("categories=");
    });
  });
});
