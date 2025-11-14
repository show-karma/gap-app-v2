/**
 * @file Tests for grant-helpers utility
 * @description Tests grant and milestone instance fetching utilities
 */

import { fetchGrantInstance, fetchMilestoneInstance } from "@/utilities/grant-helpers";

describe("fetchGrantInstance", () => {
  const mockProject = {
    uid: "project-123",
    grants: [
      { uid: "grant-1", details: { programId: "program-1" } },
      { uid: "grant-2", details: { programId: "program-2" } },
      { uid: "grant-3", details: { programId: "program-3" } },
    ],
  };

  const mockGapClient = {
    fetch: {
      projectById: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Fetch", () => {
    it("should fetch and return grant instance", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-1",
      });

      expect(mockGapClient.fetch.projectById).toHaveBeenCalledWith("project-123");
      expect(result).toEqual(mockProject.grants[0]);
    });

    it("should handle case-insensitive grant UID matching", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "GRANT-1",
      });

      expect(result).toEqual(mockProject.grants[0]);
    });

    it("should find grant in middle of array", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-2",
      });

      expect(result).toEqual(mockProject.grants[1]);
    });

    it("should find grant at end of array", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-3",
      });

      expect(result).toEqual(mockProject.grants[2]);
    });
  });

  describe("Error Cases", () => {
    it("should throw error when project not found", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(null);

      await expect(
        fetchGrantInstance({
          gapClient: mockGapClient,
          projectUid: "nonexistent-project",
          grantUid: "grant-1",
        })
      ).rejects.toThrow("Failed to fetch project data");
    });

    it("should throw error when grant not found in project", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await expect(
        fetchGrantInstance({
          gapClient: mockGapClient,
          projectUid: "project-123",
          grantUid: "nonexistent-grant",
        })
      ).rejects.toThrow("Grant not found in project");
    });

    it("should throw error when project has no grants", async () => {
      const emptyProject = { uid: "project-123", grants: [] };
      mockGapClient.fetch.projectById.mockResolvedValue(emptyProject);

      await expect(
        fetchGrantInstance({
          gapClient: mockGapClient,
          projectUid: "project-123",
          grantUid: "grant-1",
        })
      ).rejects.toThrow("Grant not found in project");
    });
  });

  describe("Edge Cases", () => {
    it("should handle mixed case UIDs", async () => {
      const mixedCaseProject = {
        uid: "project-123",
        grants: [{ uid: "GrAnT-123", details: {} }],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(mixedCaseProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-123",
      });

      expect(result.uid).toBe("GrAnT-123");
    });

    it("should handle projects with many grants", async () => {
      const manyGrants = Array.from({ length: 100 }, (_, i) => ({
        uid: `grant-${i}`,
        details: {},
      }));
      const largeProject = { uid: "project-123", grants: manyGrants };
      mockGapClient.fetch.projectById.mockResolvedValue(largeProject);

      const result = await fetchGrantInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        grantUid: "grant-99",
      });

      expect(result.uid).toBe("grant-99");
    });
  });
});

describe("fetchMilestoneInstance", () => {
  const mockMilestone = {
    uid: "milestone-1",
    title: "Test Milestone",
    completed: false,
  };

  const mockGrant = {
    uid: "grant-1",
    details: { programId: "program-1" },
    data: { communityUID: "community-123" },
    milestones: [mockMilestone],
  };

  const mockProject = {
    uid: "project-123",
    grants: [mockGrant],
  };

  const mockGapClient = {
    fetch: {
      projectById: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Fetch", () => {
    it("should fetch and return milestone instance with community UID", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchMilestoneInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
      });

      expect(mockGapClient.fetch.projectById).toHaveBeenCalledWith("project-123");
      expect(result).toEqual({
        milestoneInstance: mockMilestone,
        communityUID: "community-123",
        grantInstance: mockGrant,
      });
    });

    it("should handle missing community UID", async () => {
      const projectWithoutCommunity = {
        ...mockProject,
        grants: [
          {
            ...mockGrant,
            data: {},
          },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(projectWithoutCommunity);

      const result = await fetchMilestoneInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-1",
      });

      expect(result.communityUID).toBe("");
    });

    it("should handle case-insensitive milestone UID matching", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      const result = await fetchMilestoneInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "MILESTONE-1",
      });

      expect(result.milestoneInstance).toEqual(mockMilestone);
    });
  });

  describe("Error Cases", () => {
    it("should throw error when project not found", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(null);

      await expect(
        fetchMilestoneInstance({
          gapClient: mockGapClient,
          projectUid: "nonexistent-project",
          programId: "program-1",
          milestoneUid: "milestone-1",
        })
      ).rejects.toThrow("Failed to fetch project data");
    });

    it("should throw error when grant not found", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await expect(
        fetchMilestoneInstance({
          gapClient: mockGapClient,
          projectUid: "project-123",
          programId: "nonexistent-program",
          milestoneUid: "milestone-1",
        })
      ).rejects.toThrow("Grant not found");
    });

    it("should throw error when milestone not found", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue(mockProject);

      await expect(
        fetchMilestoneInstance({
          gapClient: mockGapClient,
          projectUid: "project-123",
          programId: "program-1",
          milestoneUid: "nonexistent-milestone",
        })
      ).rejects.toThrow("Milestone not found");
    });

    it("should throw error when grant has no milestones", async () => {
      const grantWithoutMilestones = {
        ...mockGrant,
        milestones: [],
      };
      const projectWithoutMilestones = {
        ...mockProject,
        grants: [grantWithoutMilestones],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(projectWithoutMilestones);

      await expect(
        fetchMilestoneInstance({
          gapClient: mockGapClient,
          projectUid: "project-123",
          programId: "program-1",
          milestoneUid: "milestone-1",
        })
      ).rejects.toThrow("Milestone not found");
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple grants and find correct one", async () => {
      const multiGrantProject = {
        uid: "project-123",
        grants: [
          { uid: "grant-1", details: { programId: "program-1" }, milestones: [] },
          {
            uid: "grant-2",
            details: { programId: "program-2" },
            data: { communityUID: "community-456" },
            milestones: [{ uid: "milestone-2", title: "Milestone 2" }],
          },
          { uid: "grant-3", details: { programId: "program-3" }, milestones: [] },
        ],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(multiGrantProject);

      const result = await fetchMilestoneInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-2",
        milestoneUid: "milestone-2",
      });

      expect(result.milestoneInstance.uid).toBe("milestone-2");
      expect(result.communityUID).toBe("community-456");
      expect(result.grantInstance.uid).toBe("grant-2");
    });

    it("should handle grant with multiple milestones", async () => {
      const multiMilestoneGrant = {
        ...mockGrant,
        milestones: [
          { uid: "milestone-1", title: "First" },
          { uid: "milestone-2", title: "Second" },
          { uid: "milestone-3", title: "Third" },
        ],
      };
      const projectWithMultipleMilestones = {
        ...mockProject,
        grants: [multiMilestoneGrant],
      };
      mockGapClient.fetch.projectById.mockResolvedValue(projectWithMultipleMilestones);

      const result = await fetchMilestoneInstance({
        gapClient: mockGapClient,
        projectUid: "project-123",
        programId: "program-1",
        milestoneUid: "milestone-2",
      });

      expect(result.milestoneInstance.title).toBe("Second");
    });
  });
});
