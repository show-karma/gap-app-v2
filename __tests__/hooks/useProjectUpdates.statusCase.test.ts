/**
 * The indexer stores milestone `currentStatus` in mixed case and emits it
 * verbatim as `status`, lowercasing only internally when it derives
 * `completionDetails`. An exact-match comparison in the converter therefore
 * read an uppercase `COMPLETED` row as pending, giving it a Pending badge and
 * a live "Mark Milestone Complete" button.
 */
import { describe, expect, it } from "vitest";
import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import type { GrantMilestoneCompletionDetails, UpdatesApiResponse } from "@/types/v2/roadmap";

const COMPLETION_DETAILS: GrantMilestoneCompletionDetails = {
  description: "shipped",
  completedAt: "2026-05-02T00:00:00Z",
  completedBy: "0x23B7A53ECFD93803C63B97316D7362EAE59C55B6",
  attestationUID: "0xcompleted",
};

const buildResponse = (overrides: {
  grantStatus?: string;
  projectStatus?: string;
}): UpdatesApiResponse =>
  ({
    projectUpdates: [],
    grantUpdates: [],
    endorsements: [],
    grantReceived: [],
    projectMilestones: overrides.projectStatus
      ? [
          {
            uid: "0xproj",
            title: "Project Milestone",
            description: "Test",
            dueDate: null,
            createdAt: "2026-05-01T00:00:00Z",
            recipient: "0xb4713F39476841fAF0EA5A555D0B1d451E6B05A1",
            status: overrides.projectStatus,
            completionDetails: COMPLETION_DETAILS,
          },
        ]
      : [],
    grantMilestones: overrides.grantStatus
      ? [
          {
            uid: "0xac1805",
            title: "Grant Milestone",
            description: "Test",
            chainId: "10",
            dueDate: null,
            createdAt: "2026-05-01T00:00:00Z",
            recipient: "0xb4713F39476841fAF0EA5A555D0B1d451E6B05A1",
            status: overrides.grantStatus,
            completionDetails: COMPLETION_DETAILS,
            verificationDetails: null,
            grant: {
              uid: "0xgrant",
              title: "Test Grant",
              communitySlug: "optimism",
              communityName: "Optimism",
              communityImage: "",
            },
          },
        ]
      : [],
  }) as unknown as UpdatesApiResponse;

describe("convertToUnifiedMilestones status casing", () => {
  describe("grant milestones", () => {
    it.each(["completed", "COMPLETED", "Completed", "verified", "VERIFIED"])(
      "treats %s as completed",
      (status) => {
        const [converted] = convertToUnifiedMilestones(buildResponse({ grantStatus: status }));

        expect(converted.completed).toBeTruthy();
        expect(converted.source.grantMilestone?.milestone.completed).toBeTruthy();
      }
    );

    it("leaves a pending milestone uncompleted", () => {
      const [converted] = convertToUnifiedMilestones(buildResponse({ grantStatus: "pending" }));

      expect(converted.completed).toBe(false);
      expect(converted.source.grantMilestone?.milestone.completed).toBeUndefined();
    });

    it("preserves the raw status verbatim for consumers that normalise it themselves", () => {
      const [converted] = convertToUnifiedMilestones(buildResponse({ grantStatus: "COMPLETED" }));

      expect(converted.currentStatus).toBe("COMPLETED");
    });
  });

  describe("project milestones", () => {
    it.each(["completed", "COMPLETED", "verified", "VERIFIED"])(
      "treats %s as completed",
      (status) => {
        const [converted] = convertToUnifiedMilestones(buildResponse({ projectStatus: status }));

        expect(converted.completed).toBeTruthy();
        expect(converted.source.projectMilestone?.completed).toBeTruthy();
      }
    );

    it("leaves a pending milestone uncompleted", () => {
      const [converted] = convertToUnifiedMilestones(buildResponse({ projectStatus: "pending" }));

      expect(converted.completed).toBe(false);
      expect(converted.source.projectMilestone?.completed).toBeUndefined();
    });
  });
});
