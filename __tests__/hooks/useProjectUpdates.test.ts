/**
 * Tests for convertToUnifiedMilestones utility function
 *
 * Regression test for bug: grantMilestone.milestone.refUID was missing,
 * causing "There was an error updating the milestone completion" when editing
 * milestone completions on-chain.
 */
import { describe, expect, it } from "vitest";
import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";

const createMinimalApiResponse = (
  overrides: Partial<UpdatesApiResponse> = {}
): UpdatesApiResponse => ({
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [],
  grantUpdates: [],
  endorsements: [],
  grantReceived: [],
  ...overrides,
});

describe("convertToUnifiedMilestones", () => {
  describe("grant milestones", () => {
    it("should set refUID on grantMilestone.milestone to the grant UID", () => {
      const grantUID = "0xabc123";
      const milestoneUID = "0xdef456";

      const response = createMinimalApiResponse({
        grantMilestones: [
          {
            uid: milestoneUID,
            title: "Test Milestone",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: {
              uid: grantUID,
              title: "Test Grant",
              communitySlug: "optimism",
              communityName: "Optimism",
              communityImage: "",
            },
          } as any,
        ],
      });

      const result = convertToUnifiedMilestones(response);

      const grantMilestone = result.find((m) => m.uid === milestoneUID);
      expect(grantMilestone).toBeDefined();
      expect(grantMilestone?.source.grantMilestone?.milestone.refUID).toBe(grantUID);
    });

    it("should set refUID to empty string when grant has no UID", () => {
      const response = createMinimalApiResponse({
        grantMilestones: [
          {
            uid: "0xmilestone",
            title: "Test Milestone",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: null,
          } as any,
        ],
      });

      const result = convertToUnifiedMilestones(response);

      const grantMilestone = result.find((m) => m.uid === "0xmilestone");
      expect(grantMilestone).toBeDefined();
      expect(grantMilestone?.source.grantMilestone?.milestone.refUID).toBe("");
    });

    it("should also set the top-level UnifiedMilestone refUID to the grant UID", () => {
      // MilestoneUpdate.tsx reads milestone.refUID directly (not just the nested source path)
      // to resolve grantInstance for UI display and for completeMilestone(). Both fields
      // must be consistent.
      const grantUID = "0xgrant999";
      const response = createMinimalApiResponse({
        grantMilestones: [
          {
            uid: "0xmilestone999",
            title: "Consistency Check",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: {
              uid: grantUID,
              title: "Grant",
              communitySlug: "test",
              communityName: "Test",
              communityImage: "",
            },
          } as any,
        ],
      });

      const result = convertToUnifiedMilestones(response);
      const m = result.find((x) => x.uid === "0xmilestone999");

      expect(m?.refUID).toBe(grantUID);
      expect(m?.source.grantMilestone?.milestone.refUID).toBe(grantUID);
    });

    it("should set refUID to empty string when grant uid is an empty string", () => {
      // guard against grant object being present but uid being falsy
      const response = createMinimalApiResponse({
        grantMilestones: [
          {
            uid: "0xmilestone_empty",
            title: "Empty UID",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: {
              uid: "",
              title: "Grant",
              communitySlug: "test",
              communityName: "Test",
              communityImage: "",
            },
          } as any,
        ],
      });

      const result = convertToUnifiedMilestones(response);
      const m = result.find((x) => x.uid === "0xmilestone_empty");

      expect(m?.source.grantMilestone?.milestone.refUID).toBe("");
    });

    it("should assign independent refUIDs to milestones from different grants", () => {
      const grant1UID = "0xgrant_one";
      const grant2UID = "0xgrant_two";
      const response = createMinimalApiResponse({
        grantMilestones: [
          {
            uid: "0xmilestone_a",
            title: "Milestone A",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: {
              uid: grant1UID,
              title: "Grant 1",
              communitySlug: "s1",
              communityName: "C1",
              communityImage: "",
            },
          } as any,
          {
            uid: "0xmilestone_b",
            title: "Milestone B",
            status: "pending",
            recipient: "0xrecipient",
            chainId: "10",
            grant: {
              uid: grant2UID,
              title: "Grant 2",
              communitySlug: "s2",
              communityName: "C2",
              communityImage: "",
            },
          } as any,
        ],
      });

      const result = convertToUnifiedMilestones(response);
      const a = result.find((x) => x.uid === "0xmilestone_a");
      const b = result.find((x) => x.uid === "0xmilestone_b");

      expect(a?.source.grantMilestone?.milestone.refUID).toBe(grant1UID);
      expect(b?.source.grantMilestone?.milestone.refUID).toBe(grant2UID);
    });
  });
});
