/**
 * @file Tests for project-grants.service
 * @description Tests the V2 project grants API service
 */

import { beforeEach, describe, expect, it } from "bun:test";
import type { GrantResponse } from "@/types/v2/grant";

// All mocks are pre-registered in tests/bun-setup.ts
// Access mocks via globalThis.__mocks__

// Import the service AFTER all mocks are set up
import { getProjectGrants } from "@/services/project-grants.service";

// Get mocks from globalThis
const getMocks = () => (globalThis as any).__mocks__;

describe("project-grants.service", () => {
  let mockFetchData: any;

  beforeEach(() => {
    const mocks = getMocks();
    mockFetchData = mocks.fetchData;

    // Clear mocks
    if (mockFetchData?.mockClear) mockFetchData.mockClear();
  });

  describe("getProjectGrants", () => {
    const mockGrants: GrantResponse[] = [
      {
        uid: "0xgrant1",
        chainID: 10,
        details: {
          title: "Test Grant 1",
          description: "Description 1",
        },
        milestones: [],
        updates: [],
      },
      {
        uid: "0xgrant2",
        chainID: 10,
        details: {
          title: "Test Grant 2",
          description: "Description 2",
        },
        milestones: [],
        updates: [],
      },
    ];

    it("should return grants array when API returns array", async () => {
      mockFetchData.mockResolvedValueOnce([mockGrants, null, null, 200]);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual(mockGrants);
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("test-project"));
    });

    it("should return array with single grant when API returns single object", async () => {
      const singleGrant = mockGrants[0];
      mockFetchData.mockResolvedValueOnce([singleGrant, null, null, 200]);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([singleGrant]);
    });

    it("should return empty array when API returns null", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Not found", null, 404]);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Not found", null, 404]);

      const result = await getProjectGrants("nonexistent-project");

      expect(result).toEqual([]);
    });

    it("should return empty array on API error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Server error", null, 500]);

      const result = await getProjectGrants("test-project");

      expect(result).toEqual([]);
    });

    it("should call correct endpoint for project slug", async () => {
      mockFetchData.mockResolvedValueOnce([mockGrants, null, null, 200]);

      await getProjectGrants("my-project-slug");

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("my-project-slug"));
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("/grants"));
    });

    it("should call correct endpoint for project UID", async () => {
      mockFetchData.mockResolvedValueOnce([mockGrants, null, null, 200]);

      await getProjectGrants("0x1234567890");

      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("0x1234567890"));
    });
  });
});
