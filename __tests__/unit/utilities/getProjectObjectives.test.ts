/**
 * @file Tests for getProjectObjectives (V2 API)
 * @description Tests for fetching project milestones using V2 endpoint
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fetchDataModule from "@/utilities/fetchData";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";

// Use spyOn instead of jest.mock to avoid polluting global mock state
let mockFetchData: ReturnType<typeof spyOn>;

describe("getProjectObjectives (V2)", () => {
  const mockMilestones = [
    {
      uid: "milestone-123",
      title: "Complete Phase 1",
      description: "First phase of development",
      dueDate: "2024-06-30T00:00:00.000Z",
      currentStatus: "in_progress",
      statusUpdatedAt: "2024-01-15T00:00:00.000Z",
      completed: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      uid: "milestone-456",
      title: "Complete Phase 2",
      description: "Second phase of development",
      dueDate: "2024-12-31T00:00:00.000Z",
      currentStatus: "completed",
      statusUpdatedAt: "2024-03-01T00:00:00.000Z",
      completed: {
        timestamp: "2024-02-28T00:00:00.000Z",
        attestationUID: "0xattestation123",
        proofOfWork: "https://proof.example.com",
        reason: "Completed on schedule",
        attester: "0xattester123",
      },
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  ];

  const mockV2Response = {
    milestones: mockMilestones,
  };

  beforeEach(() => {
    mockFetchData = spyOn(fetchDataModule, "default").mockImplementation(() =>
      Promise.resolve([null, null])
    );
  });

  afterEach(() => {
    // Restore spies to prevent pollution of other test files
    mockFetchData?.mockRestore();
  });

  describe("getProjectObjectives", () => {
    const projectId = "project-123";

    it("should fetch project milestones successfully", async () => {
      mockFetchData.mockResolvedValue([mockV2Response, null]);

      const result = await getProjectObjectives(projectId);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.PROJECTS.MILESTONES(projectId),
        "GET",
        {},
        {},
        {},
        false
      );
      expect(result).toHaveLength(2);
    });

    it("should map V2 response to SDK format correctly", async () => {
      mockFetchData.mockResolvedValue([mockV2Response, null]);

      const result = await getProjectObjectives(projectId);

      // Check first milestone (not completed)
      expect(result[0].uid).toBe("milestone-123");
      expect(result[0].title).toBe("Complete Phase 1");
      expect(result[0].description).toBe("First phase of development");
      expect(result[0].endsAt).toBeInstanceOf(Date);
      // The implementation maps null completed to undefined
      expect(result[0].completed).toBeUndefined();
      expect(result[0].createdAt).toBeInstanceOf(Date);

      // Check second milestone (completed)
      expect(result[1].uid).toBe("milestone-456");
      expect(result[1].completed).not.toBeNull();
      expect(result[1].completed?.uid).toBe("0xattestation123");
      expect(result[1].completed?.createdAt).toBeInstanceOf(Date);
      expect(result[1].completed?.data?.reason).toBe("Completed on schedule");
      expect(result[1].completed?.data?.proofOfWork).toBe("https://proof.example.com");
    });

    it("should return empty array when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Not found"]);

      const result = await getProjectObjectives(projectId);

      expect(result).toEqual([]);
    });

    it("should return empty array when no milestones exist", async () => {
      mockFetchData.mockResolvedValue([{ milestones: [] }, null]);

      const result = await getProjectObjectives(projectId);

      expect(result).toEqual([]);
    });

    it("should handle milestone without dueDate", async () => {
      const milestonesWithoutDueDate = [
        {
          uid: "milestone-789",
          title: "No Due Date Milestone",
          description: "A milestone without due date",
          dueDate: null,
          currentStatus: "pending",
          statusUpdatedAt: null,
          completed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockFetchData.mockResolvedValue([{ milestones: milestonesWithoutDueDate }, null]);

      const result = await getProjectObjectives(projectId);

      expect(result[0].endsAt).toBeUndefined();
    });

    it("should work with project slug instead of UID", async () => {
      const projectSlug = "my-project-slug";
      mockFetchData.mockResolvedValue([mockV2Response, null]);

      await getProjectObjectives(projectSlug);

      expect(mockFetchData).toHaveBeenCalledWith(
        INDEXER.V2.PROJECTS.MILESTONES(projectSlug),
        "GET",
        {},
        {},
        {},
        false
      );
    });

    it("should handle fetch throwing an error", async () => {
      mockFetchData.mockRejectedValue(new Error("Network error"));

      const result = await getProjectObjectives(projectId);

      expect(result).toEqual([]);
    });
  });
});
