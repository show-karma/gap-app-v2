import { getCommunityGrants } from "../community-grants.service";

jest.mock("@/utilities/fetchData");
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

import fetchData from "@/utilities/fetchData";
import { errorManager } from "@/components/Utilities/errorManager";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

describe("community-grants.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCommunityGrants", () => {
    const communitySlug = "test-community";

    it("should fetch grants successfully", async () => {
      const mockGrants = [
        {
          uid: "grant-1",
          programId: "program-1",
          title: "Grant One",
          description: "First grant description",
          projectUID: "project-1",
          projectTitle: "Project One",
          projectSlug: "project-one",
          categories: ["DeFi", "Infrastructure"],
        },
        {
          uid: "grant-2",
          programId: "program-2",
          title: "Grant Two",
          description: "Second grant description",
          projectUID: "project-2",
          projectTitle: "Project Two",
          projectSlug: "project-two",
          categories: ["Gaming"],
        },
      ];

      mockFetchData.mockResolvedValue([mockGrants, null]);

      const result = await getCommunityGrants(communitySlug);

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/communities/${communitySlug}/grants`
      );
      expect(result).toEqual(mockGrants);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should return empty array when no grants exist", async () => {
      mockFetchData.mockResolvedValue([[], null]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toEqual([]);
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should return empty array and log error on API error", async () => {
      mockFetchData.mockResolvedValue([null, "Server error"]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Community Grants API Error: Server error",
        "Server error",
        {
          context: "community-grants.service",
          communitySlug,
        }
      );
    });

    it("should return empty array when data is undefined", async () => {
      mockFetchData.mockResolvedValue([undefined, null]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toEqual([]);
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should handle grants with empty categories", async () => {
      const mockGrants = [
        {
          uid: "grant-1",
          programId: "program-1",
          title: "Grant Without Categories",
          description: "A grant with no categories",
          projectUID: "project-1",
          projectTitle: "Project One",
          projectSlug: "project-one",
          categories: [],
        },
      ];

      mockFetchData.mockResolvedValue([mockGrants, null]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toHaveLength(1);
      expect(result[0].categories).toEqual([]);
    });

    it("should handle grants with empty programId", async () => {
      const mockGrants = [
        {
          uid: "grant-1",
          programId: "",
          title: "Grant Without Program",
          description: "A grant without program ID",
          projectUID: "project-1",
          projectTitle: "Project One",
          projectSlug: "project-one",
          categories: ["Category"],
        },
      ];

      mockFetchData.mockResolvedValue([mockGrants, null]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toHaveLength(1);
      expect(result[0].programId).toBe("");
    });

    it("should use the correct endpoint for different community slugs", async () => {
      mockFetchData.mockResolvedValue([[], null]);

      await getCommunityGrants("optimism");
      expect(mockFetchData).toHaveBeenCalledWith("/v2/communities/optimism/grants");

      await getCommunityGrants("gitcoin");
      expect(mockFetchData).toHaveBeenCalledWith("/v2/communities/gitcoin/grants");
    });

    it("should handle large response with many grants", async () => {
      const mockGrants = Array.from({ length: 100 }, (_, i) => ({
        uid: `grant-${i}`,
        programId: `program-${i}`,
        title: `Grant ${i}`,
        description: `Description ${i}`,
        projectUID: `project-${i}`,
        projectTitle: `Project ${i}`,
        projectSlug: `project-${i}`,
        categories: [`Category ${i}`],
      }));

      mockFetchData.mockResolvedValue([mockGrants, null]);

      const result = await getCommunityGrants(communitySlug);

      expect(result).toHaveLength(100);
    });
  });
});
