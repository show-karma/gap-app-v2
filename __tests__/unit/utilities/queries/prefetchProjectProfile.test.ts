/**
 * @file Tests for prefetchProjectProfile utility
 * @description Tests error handling for parallel prefetch operations
 */

import type { QueryClient } from "@tanstack/react-query";

// Mock the service modules
jest.mock("@/services/project-grants.service", () => ({
  getProjectGrants: jest.fn(),
}));

jest.mock("@/services/project-impacts.service", () => ({
  getProjectImpacts: jest.fn(),
}));

jest.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: jest.fn(),
}));

// Import mocked services
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { getProjectUpdates } from "@/services/project-updates.service";
import { prefetchProjectProfileData } from "@/utilities/queries/prefetchProjectProfile";

const mockGetProjectGrants = getProjectGrants as jest.MockedFunction<typeof getProjectGrants>;
const mockGetProjectImpacts = getProjectImpacts as jest.MockedFunction<typeof getProjectImpacts>;
const mockGetProjectUpdates = getProjectUpdates as jest.MockedFunction<typeof getProjectUpdates>;

describe("prefetchProjectProfile", () => {
  let mockQueryClient: jest.Mocked<QueryClient>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock QueryClient with prefetchQuery
    mockQueryClient = {
      prefetchQuery: jest.fn().mockImplementation(async (options) => {
        // Execute the queryFn to simulate the prefetch
        return options.queryFn();
      }),
    } as unknown as jest.Mocked<QueryClient>;

    // Spy on console.warn to verify logging
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("prefetchProjectProfileData", () => {
    const projectId = "test-project-123";

    it("should return success status for all queries when all succeed", async () => {
      mockGetProjectGrants.mockResolvedValueOnce([]);
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      const result = await prefetchProjectProfileData(mockQueryClient, projectId);

      expect(result).toEqual({
        grants: true,
        updates: true,
        impacts: true,
      });
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledTimes(3);
    });

    it("should continue prefetching other queries when grants query fails", async () => {
      mockGetProjectGrants.mockRejectedValueOnce(new Error("Grants API failed"));
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      const result = await prefetchProjectProfileData(mockQueryClient, projectId);

      // grants should be false, others should be true
      expect(result).toEqual({
        grants: false,
        updates: true,
        impacts: true,
      });
      // All prefetch calls should still have been attempted
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledTimes(3);
    });

    it("should continue prefetching other queries when updates query fails", async () => {
      mockGetProjectGrants.mockResolvedValueOnce([]);
      mockGetProjectUpdates.mockRejectedValueOnce(new Error("Updates API failed"));
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      const result = await prefetchProjectProfileData(mockQueryClient, projectId);

      expect(result).toEqual({
        grants: true,
        updates: false,
        impacts: true,
      });
    });

    it("should continue prefetching other queries when impacts query fails", async () => {
      mockGetProjectGrants.mockResolvedValueOnce([]);
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockRejectedValueOnce(new Error("Impacts API failed"));

      const result = await prefetchProjectProfileData(mockQueryClient, projectId);

      expect(result).toEqual({
        grants: true,
        updates: true,
        impacts: false,
      });
    });

    it("should handle all queries failing without throwing", async () => {
      mockGetProjectGrants.mockRejectedValueOnce(new Error("Grants API failed"));
      mockGetProjectUpdates.mockRejectedValueOnce(new Error("Updates API failed"));
      mockGetProjectImpacts.mockRejectedValueOnce(new Error("Impacts API failed"));

      // Should not throw
      const result = await prefetchProjectProfileData(mockQueryClient, projectId);

      expect(result).toEqual({
        grants: false,
        updates: false,
        impacts: false,
      });
    });

    it("should log warnings in development when queries fail", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      mockGetProjectGrants.mockRejectedValueOnce(new Error("Grants API failed"));
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      await prefetchProjectProfileData(mockQueryClient, projectId);

      // The console.warn is called with a message containing the query name and the error
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("grants"),
        expect.any(Error)
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should not log warnings in production when queries fail", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      mockGetProjectGrants.mockRejectedValueOnce(new Error("Grants API failed"));
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      await prefetchProjectProfileData(mockQueryClient, projectId);

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should call prefetchQuery with correct query keys", async () => {
      mockGetProjectGrants.mockResolvedValueOnce([]);
      mockGetProjectUpdates.mockResolvedValueOnce([]);
      mockGetProjectImpacts.mockResolvedValueOnce([]);

      await prefetchProjectProfileData(mockQueryClient, projectId);

      // QUERY_KEYS.PROJECT.GRANTS(projectId) returns ["project-grants", projectId]
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["project-grants", projectId],
          staleTime: 5 * 60 * 1000,
        })
      );
      // QUERY_KEYS.PROJECT.UPDATES(projectId) returns ["project-updates", projectId]
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["project-updates", projectId],
          staleTime: 5 * 60 * 1000,
        })
      );
      // QUERY_KEYS.PROJECT.IMPACTS(projectId) returns ["project-impacts", projectId]
      expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["project-impacts", projectId],
          staleTime: 5 * 60 * 1000,
        })
      );
    });
  });
});
