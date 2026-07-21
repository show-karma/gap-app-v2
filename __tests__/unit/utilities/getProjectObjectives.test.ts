/**
 * @file Tests for getProjectObjectives (V2 API)
 * @description Tests for fetching project milestones using V2 endpoint
 */

import { api } from "@/utilities/api/client";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { INDEXER } from "@/utilities/indexer";

// Mock the api client
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

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
    vi.clearAllMocks();
  });

  describe("getProjectObjectives", () => {
    const projectId = "project-123";

    it("should fetch project milestones successfully", async () => {
      (api.get as vi.Mock).mockResolvedValue(mockV2Response);

      const result = await getProjectObjectives(projectId);

      expect(api.get).toHaveBeenCalledWith(INDEXER.V2.PROJECTS.MILESTONES(projectId), {
        isAuthorized: false,
      });
      expect(result).toHaveLength(2);
    });

    it("should map V2 response to SDK format correctly", async () => {
      (api.get as vi.Mock).mockResolvedValue(mockV2Response);

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

    it("should return empty array when fetch resolves without data", async () => {
      (api.get as vi.Mock).mockResolvedValue(null);

      const result = await getProjectObjectives(projectId);

      expect(result).toEqual([]);
    });

    it("should return empty array when no milestones exist", async () => {
      (api.get as vi.Mock).mockResolvedValue({ milestones: [] });

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

      (api.get as vi.Mock).mockResolvedValue({ milestones: milestonesWithoutDueDate });

      const result = await getProjectObjectives(projectId);

      expect(result[0].endsAt).toBeUndefined();
    });

    it("should work with project slug instead of UID", async () => {
      const projectSlug = "my-project-slug";
      (api.get as vi.Mock).mockResolvedValue(mockV2Response);

      await getProjectObjectives(projectSlug);

      expect(api.get).toHaveBeenCalledWith(INDEXER.V2.PROJECTS.MILESTONES(projectSlug), {
        isAuthorized: false,
      });
    });

    it("should handle fetch throwing an error", async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error("Network error"));

      const result = await getProjectObjectives(projectId);

      expect(result).toEqual([]);
    });
  });
});
