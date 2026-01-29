import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { mergeDuplicateMilestones } from "@/utilities/milestones/mergeDuplicateMilestones";

/**
 * Creates a mock UnifiedMilestone for testing.
 */
function createMockMilestone(overrides: Partial<UnifiedMilestone> = {}): UnifiedMilestone {
  return {
    uid: "milestone-1",
    title: "Test Milestone",
    description: "Test description",
    completed: false,
    type: "project",
    createdAt: "2024-01-01T00:00:00Z",
    chainID: 1,
    refUID: "ref-1",
    source: {
      projectMilestone: {
        uid: "pm-1",
        attester: "0x1234567890123456789012345678901234567890",
      },
    },
    ...overrides,
  };
}

/**
 * Creates a mock grant milestone with full source details.
 */
function createMockGrantMilestone(
  uid: string,
  title: string,
  grantTitle: string,
  communityName: string,
  options: {
    description?: string;
    startsAt?: number;
    endsAt?: number;
    chainID?: number;
    programId?: string;
    communityImage?: string;
  } = {}
): UnifiedMilestone {
  return {
    uid,
    title,
    description: options.description || "Grant milestone description",
    completed: false,
    type: "grant",
    createdAt: "2024-01-01T00:00:00Z",
    chainID: options.chainID || 1,
    refUID: `grant-${uid}`,
    startsAt: options.startsAt,
    endsAt: options.endsAt,
    source: {
      grantMilestone: {
        milestone: {
          uid: `gm-${uid}`,
          chainID: options.chainID || 1,
          title,
          verified: [],
        },
        grant: {
          uid: `grant-${uid}`,
          chainID: options.chainID || 1,
          details: {
            title: grantTitle,
            programId: options.programId,
          },
          community: {
            uid: "community-1",
            chainID: options.chainID || 1,
            details: {
              name: communityName,
              imageURL: options.communityImage || "https://example.com/image.png",
            },
          },
        },
      },
    },
  };
}

describe("mergeDuplicateMilestones", () => {
  describe("Basic Functionality", () => {
    it("should return empty array for empty input", () => {
      const result = mergeDuplicateMilestones([]);
      expect(result).toEqual([]);
    });

    it("should return single milestone unchanged", () => {
      const milestone = createMockMilestone();
      const result = mergeDuplicateMilestones([milestone]);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("milestone-1");
    });

    it("should preserve all milestones when no duplicates exist", () => {
      const milestones = [
        createMockMilestone({ uid: "m-1", title: "Milestone 1" }),
        createMockMilestone({ uid: "m-2", title: "Milestone 2" }),
        createMockMilestone({ uid: "m-3", title: "Milestone 3" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(3);
    });
  });

  describe("Unique Type Handling", () => {
    it("should keep update type milestones as unique entries", () => {
      const milestones = [
        createMockMilestone({ uid: "u-1", type: "update", title: "Same Title" }),
        createMockMilestone({ uid: "u-2", type: "update", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should keep impact type milestones as unique entries", () => {
      const milestones = [
        createMockMilestone({ uid: "i-1", type: "impact", title: "Same Title" }),
        createMockMilestone({ uid: "i-2", type: "impact", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should keep activity type milestones as unique entries", () => {
      const milestones = [
        createMockMilestone({ uid: "a-1", type: "activity", title: "Same Title" }),
        createMockMilestone({ uid: "a-2", type: "activity", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should keep grant_update type milestones as unique entries", () => {
      const milestones = [
        createMockMilestone({ uid: "gu-1", type: "grant_update", title: "Same Title" }),
        createMockMilestone({ uid: "gu-2", type: "grant_update", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });
  });

  describe("Project and Milestone Type Handling", () => {
    it("should keep project type milestones as unique entries by uid", () => {
      const milestones = [
        createMockMilestone({ uid: "p-1", type: "project", title: "Same Title" }),
        createMockMilestone({ uid: "p-2", type: "project", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should keep milestone type as unique entries by uid", () => {
      const milestones = [
        createMockMilestone({ uid: "m-1", type: "milestone", title: "Same Title" }),
        createMockMilestone({ uid: "m-2", type: "milestone", title: "Same Title" }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should set refUID from projectMilestone source for project types", () => {
      const milestone = createMockMilestone({
        uid: "p-1",
        type: "project",
        refUID: "original-ref",
        source: {
          projectMilestone: {
            uid: "pm-source-uid",
            attester: "0x1234",
          },
        },
      });

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].refUID).toBe("pm-source-uid");
    });
  });

  describe("Grant Milestone Merging", () => {
    it("should merge grant milestones with identical title, description, and dates", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Shared Milestone", "Grant A", "Community A", {
          description: "Same description",
          startsAt: 1704067200,
          endsAt: 1706745600,
        }),
        createMockGrantMilestone("g-2", "Shared Milestone", "Grant B", "Community B", {
          description: "Same description",
          startsAt: 1704067200,
          endsAt: 1706745600,
        }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);
      expect(result[0].mergedGrants).toHaveLength(2);
    });

    it("should not merge grant milestones with different titles", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Milestone A", "Grant A", "Community A"),
        createMockGrantMilestone("g-2", "Milestone B", "Grant B", "Community B"),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should not merge grant milestones with different descriptions", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Same Title", "Grant A", "Community A", {
          description: "Description A",
        }),
        createMockGrantMilestone("g-2", "Same Title", "Grant B", "Community B", {
          description: "Description B",
        }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should not merge grant milestones with different start dates", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Same Title", "Grant A", "Community A", {
          startsAt: 1704067200,
        }),
        createMockGrantMilestone("g-2", "Same Title", "Grant B", "Community B", {
          startsAt: 1706745600,
        }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should not merge grant milestones with different end dates", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Same Title", "Grant A", "Community A", {
          endsAt: 1704067200,
        }),
        createMockGrantMilestone("g-2", "Same Title", "Grant B", "Community B", {
          endsAt: 1706745600,
        }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(2);
    });

    it("should correctly populate mergedGrants with grant details", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Shared", "Grant Alpha", "Community X", {
          programId: "prog-1",
          communityImage: "https://example.com/x.png",
          chainID: 1,
        }),
        createMockGrantMilestone("g-2", "Shared", "Grant Beta", "Community Y", {
          programId: "prog-2",
          communityImage: "https://example.com/y.png",
          chainID: 42,
        }),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);

      const mergedGrants = result[0].mergedGrants!;
      expect(mergedGrants).toHaveLength(2);

      // Should be sorted alphabetically by grant title
      expect(mergedGrants[0].grantTitle).toBe("Grant Alpha");
      expect(mergedGrants[0].communityName).toBe("Community X");
      expect(mergedGrants[0].programId).toBe("prog-1");
      expect(mergedGrants[0].chainID).toBe(1);

      expect(mergedGrants[1].grantTitle).toBe("Grant Beta");
      expect(mergedGrants[1].communityName).toBe("Community Y");
      expect(mergedGrants[1].programId).toBe("prog-2");
      expect(mergedGrants[1].chainID).toBe(42);
    });

    it("should sort merged grants alphabetically by title", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Shared", "Zebra Grant", "Community 1"),
        createMockGrantMilestone("g-2", "Shared", "Alpha Grant", "Community 2"),
        createMockGrantMilestone("g-3", "Shared", "Middle Grant", "Community 3"),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);

      const mergedGrants = result[0].mergedGrants!;
      expect(mergedGrants).toHaveLength(3);
      expect(mergedGrants[0].grantTitle).toBe("Alpha Grant");
      expect(mergedGrants[1].grantTitle).toBe("Middle Grant");
      expect(mergedGrants[2].grantTitle).toBe("Zebra Grant");
    });

    it("should use 'Untitled Grant' for sorting when grant title is missing", () => {
      const milestoneWithoutTitle: UnifiedMilestone = {
        uid: "g-1",
        title: "Shared",
        description: "Same description",
        completed: false,
        type: "grant",
        createdAt: "2024-01-01T00:00:00Z",
        chainID: 1,
        refUID: "ref-1",
        source: {
          grantMilestone: {
            milestone: { uid: "gm-1", chainID: 1, title: "Shared", verified: [] },
            grant: {
              uid: "grant-1",
              chainID: 1,
              details: undefined,
              community: { uid: "c-1", chainID: 1 },
            },
          },
        },
      };

      const milestoneWithTitle = createMockGrantMilestone(
        "g-2",
        "Shared",
        "Alpha Grant",
        "Community",
        {
          description: "Same description",
        }
      );

      const result = mergeDuplicateMilestones([milestoneWithoutTitle, milestoneWithTitle]);
      expect(result).toHaveLength(1);

      const mergedGrants = result[0].mergedGrants!;
      expect(mergedGrants).toHaveLength(2);
      // Alpha Grant should come before "Untitled Grant"
      expect(mergedGrants[0].grantTitle).toBe("Alpha Grant");
      expect(mergedGrants[1].grantTitle).toBeUndefined();
    });
  });

  describe("Mixed Type Handling", () => {
    it("should handle mixed milestone types correctly", () => {
      const milestones = [
        createMockMilestone({ uid: "p-1", type: "project" }),
        createMockMilestone({ uid: "u-1", type: "update" }),
        createMockMilestone({ uid: "a-1", type: "activity" }),
        createMockMilestone({ uid: "i-1", type: "impact" }),
        createMockGrantMilestone("g-1", "Grant Milestone", "Grant A", "Community A"),
      ];

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(5);
    });

    it("should preserve order for non-grant types while merging grants", () => {
      const milestones = [
        createMockMilestone({ uid: "p-1", type: "project", title: "Project 1" }),
        createMockGrantMilestone("g-1", "Shared Grant Milestone", "Grant A", "Community A"),
        createMockMilestone({ uid: "u-1", type: "update", title: "Update 1" }),
        createMockGrantMilestone("g-2", "Shared Grant Milestone", "Grant B", "Community B"),
      ];

      const result = mergeDuplicateMilestones(milestones);
      // Project, first grant (merged), update = 3 items
      expect(result).toHaveLength(3);

      // The merged grant should have 2 grants
      const mergedItem = result.find((m) => m.mergedGrants && m.mergedGrants.length > 1);
      expect(mergedItem).toBeDefined();
      expect(mergedItem!.mergedGrants).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle milestones with undefined description", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Title", "Grant A", "Community A"),
        createMockGrantMilestone("g-2", "Title", "Grant B", "Community B"),
      ];
      // Remove descriptions
      milestones[0].description = undefined;
      milestones[1].description = undefined;

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);
      expect(result[0].mergedGrants).toHaveLength(2);
    });

    it("should handle milestones with undefined dates", () => {
      const milestones = [
        createMockGrantMilestone("g-1", "Title", "Grant A", "Community A"),
        createMockGrantMilestone("g-2", "Title", "Grant B", "Community B"),
      ];
      // Dates are already undefined by default

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);
    });

    it("should handle milestone with empty uid", () => {
      const milestone = createMockMilestone({ uid: "", type: "project" });
      const result = mergeDuplicateMilestones([milestone]);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("");
    });

    it("should handle milestone with missing source data", () => {
      const milestone: UnifiedMilestone = {
        uid: "m-1",
        title: "Test",
        description: "Test",
        completed: false,
        type: "grant",
        createdAt: "2024-01-01T00:00:00Z",
        chainID: 1,
        refUID: "ref-1",
        source: {},
      };

      const result = mergeDuplicateMilestones([milestone]);
      expect(result).toHaveLength(1);
      expect(result[0].chainID).toBe(0); // Falls back to 0 when source is missing
    });

    it("should handle large number of duplicate milestones", () => {
      const milestones = Array.from({ length: 100 }, (_, i) =>
        createMockGrantMilestone(`g-${i}`, "Same Title", `Grant ${i}`, `Community ${i}`)
      );

      const result = mergeDuplicateMilestones(milestones);
      expect(result).toHaveLength(1);
      expect(result[0].mergedGrants).toHaveLength(100);
    });

    it("should not mutate original milestone array", () => {
      const original = createMockGrantMilestone("g-1", "Title", "Grant", "Community");
      const milestones = [original];
      const originalLength = milestones.length;

      mergeDuplicateMilestones(milestones);

      expect(milestones).toHaveLength(originalLength);
      expect(milestones[0]).toBe(original);
    });
  });

  describe("ChainID Handling", () => {
    it("should use grant chainID for merged grant milestones", () => {
      const milestone = createMockGrantMilestone("g-1", "Title", "Grant", "Community", {
        chainID: 42,
      });

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].chainID).toBe(42);
    });

    it("should preserve chainID for project milestones", () => {
      const milestone = createMockMilestone({
        uid: "p-1",
        type: "project",
        chainID: 137,
      });

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].chainID).toBe(137);
    });

    it("should default chainID to 0 when source grant has no chainID", () => {
      const milestone: UnifiedMilestone = {
        uid: "g-1",
        title: "Test",
        completed: false,
        type: "grant",
        createdAt: "2024-01-01T00:00:00Z",
        chainID: 1,
        refUID: "ref-1",
        source: {
          grantMilestone: {
            milestone: { uid: "gm-1", chainID: 0, title: "Test", verified: [] },
            grant: {
              uid: "grant-1",
              chainID: 0,
              community: { uid: "c-1", chainID: 1 },
            },
          },
        },
      };

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].chainID).toBe(0);
    });
  });

  describe("RefUID Handling", () => {
    it("should set refUID to grant UID for grant milestones", () => {
      const milestone = createMockGrantMilestone("g-1", "Title", "Grant", "Community");
      const result = mergeDuplicateMilestones([milestone]);

      expect(result[0].refUID).toBe("grant-g-1");
    });

    it("should use projectMilestone uid for project type refUID", () => {
      const milestone = createMockMilestone({
        uid: "p-1",
        type: "project",
        refUID: "ignored-ref",
        source: {
          projectMilestone: {
            uid: "pm-ref-uid",
            attester: "0x123",
          },
        },
      });

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].refUID).toBe("pm-ref-uid");
    });

    it("should fallback to original refUID if projectMilestone uid is missing", () => {
      const milestone = createMockMilestone({
        uid: "p-1",
        type: "project",
        refUID: "fallback-ref",
        source: {
          projectMilestone: {
            uid: "",
            attester: "0x123",
          },
        },
      });

      const result = mergeDuplicateMilestones([milestone]);
      expect(result[0].refUID).toBe("fallback-ref");
    });
  });
});
