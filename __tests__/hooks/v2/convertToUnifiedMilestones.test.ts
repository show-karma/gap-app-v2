import { convertToUnifiedMilestones } from "@/hooks/v2/useProjectUpdates";
import type {
  GrantMilestoneWithDetails,
  GrantUpdateWithDetails,
  ProjectMilestone,
  ProjectUpdate,
  UpdatesApiResponse,
} from "@/types/v2/roadmap";

const emptyResponse: UpdatesApiResponse = {
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [],
  grantUpdates: [],
};

const makeProjectUpdate = (overrides?: Partial<ProjectUpdate>): ProjectUpdate => ({
  uid: "pu-1",
  recipient: "0xRecipient",
  title: "Project Update",
  description: "Description",
  verified: false,
  startDate: null,
  endDate: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  associations: { deliverables: [], indicators: [], funding: [] },
  ...overrides,
});

const makeProjectMilestone = (overrides?: Partial<ProjectMilestone>): ProjectMilestone => ({
  uid: "pm-1",
  title: "Project Milestone",
  description: "Description",
  dueDate: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  status: "pending",
  completionDetails: null,
  ...overrides,
});

const makeGrantMilestone = (
  overrides?: Partial<GrantMilestoneWithDetails>
): GrantMilestoneWithDetails => ({
  uid: "gm-1",
  chainId: "10",
  title: "Grant Milestone",
  description: "Description",
  dueDate: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  status: "pending",
  completionDetails: null,
  verificationDetails: null,
  ...overrides,
});

const makeGrantUpdate = (overrides?: Partial<GrantUpdateWithDetails>): GrantUpdateWithDetails => ({
  uid: "gu-1",
  refUID: "ref-1",
  chainId: 10,
  recipient: "0xUpdater",
  title: "Grant Update",
  text: "Update text",
  proofOfWork: "",
  completionPercentage: "50",
  currentStatus: "active",
  statusUpdatedAt: null,
  verified: false,
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("convertToUnifiedMilestones", () => {
  it("returns empty array for empty response", () => {
    const result = convertToUnifiedMilestones(emptyResponse);
    expect(result).toEqual([]);
  });

  describe("project updates", () => {
    it("converts a project update to unified format", () => {
      const update = makeProjectUpdate({ uid: "pu-42", title: "Weekly Update" });
      const result = convertToUnifiedMilestones({ ...emptyResponse, projectUpdates: [update] });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uid: "pu-42",
        type: "activity",
        title: "Weekly Update",
        completed: false,
      });
      expect(result[0].projectUpdate).toBeDefined();
    });
  });

  describe("project milestones", () => {
    it("marks pending milestone as not completed", () => {
      const milestone = makeProjectMilestone({ status: "pending" });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        projectMilestones: [milestone],
      });

      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(false);
    });

    it("marks completed milestone with completion data", () => {
      const milestone = makeProjectMilestone({
        status: "completed",
        completionDetails: {
          description: "Done",
          completedAt: "2025-06-01T00:00:00.000Z",
          completedBy: "0xCompleter",
          proofOfWork: "https://proof.link",
        },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        projectMilestones: [milestone],
      });

      expect(result[0].completed).toEqual({
        createdAt: "2025-06-01T00:00:00.000Z",
        data: {
          proofOfWork: "https://proof.link",
          reason: "Done",
        },
      });
    });

    it('treats "verified" status as completed', () => {
      const milestone = makeProjectMilestone({
        status: "verified",
        completionDetails: {
          description: "Verified milestone",
          completedAt: "2025-06-01T00:00:00.000Z",
          completedBy: "0xVerifier",
        },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        projectMilestones: [milestone],
      });

      expect(result[0].completed).toBeTruthy();
      expect(typeof result[0].completed).toBe("object");
    });
  });

  describe("grant milestones", () => {
    it("maps basic grant milestone fields", () => {
      const milestone = makeGrantMilestone({
        uid: "gm-99",
        chainId: "42161",
        title: "Deliverable 1",
        grant: { uid: "grant-1", title: "My Grant", communitySlug: "optimism" },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uid: "gm-99",
        type: "grant",
        title: "Deliverable 1",
        chainID: 42161,
        refUID: "grant-1",
      });
    });

    it("handles verified status with verification details", () => {
      const milestone = makeGrantMilestone({
        status: "verified",
        completionDetails: {
          description: "All done",
          completedAt: "2025-05-01T00:00:00.000Z",
          completedBy: "0xOwner",
          proofOfWork: "https://proof.link",
          completionPercentage: 100,
          deliverables: [{ name: "Feature", proof: "https://feature.link" }],
        },
        verificationDetails: {
          description: "Looks good",
          verifiedAt: "2025-05-15T00:00:00.000Z",
          verifiedBy: "0xVerifier",
          attestationUID: "att-123",
        },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      // Completion data should be present
      expect(result[0].completed).toEqual({
        createdAt: "2025-05-01T00:00:00.000Z",
        data: {
          proofOfWork: "https://proof.link",
          reason: "All done",
          completionPercentage: 100,
          deliverables: [{ name: "Feature", proof: "https://feature.link" }],
        },
      });

      // Verification data should be in source.grantMilestone.milestone.verified
      const verified = result[0].source.grantMilestone?.milestone.verified;
      expect(verified).toHaveLength(1);
      expect(verified?.[0]).toMatchObject({
        attester: "0xVerifier",
        reason: "Looks good",
        uid: "att-123",
      });
    });

    it("produces empty verified array when no verification details", () => {
      const milestone = makeGrantMilestone({ status: "completed", verificationDetails: null });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].source.grantMilestone?.milestone.verified).toEqual([]);
    });

    it("uses recipient fallback chain for attester", () => {
      const milestone = makeGrantMilestone({
        recipient: undefined,
        attester: "0xAttester",
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].source.grantMilestone?.milestone.attester).toBe("0xAttester");
    });

    it("uses data.attester when recipient and attester are missing", () => {
      const milestone = makeGrantMilestone({
        recipient: undefined,
        attester: undefined,
        completionDetails: null,
        fundingApplicationCompletion: undefined,
        data: { attester: "0xDataAttester" },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].source.grantMilestone?.milestone.attester).toBe("0xDataAttester");
    });

    it("converts dueDate to unix timestamp for endsAt", () => {
      const milestone = makeGrantMilestone({
        dueDate: "2025-12-31T00:00:00.000Z",
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      const expected = Math.floor(new Date("2025-12-31T00:00:00.000Z").getTime() / 1000);
      expect(result[0].endsAt).toBe(expected);
    });

    it("uses data.endsAt fallback when dueDate is null", () => {
      const milestone = makeGrantMilestone({
        dueDate: null,
        data: { endsAt: 1735689600 }, // seconds
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].endsAt).toBe(1735689600);
    });

    it("normalizes millisecond endsAt to seconds", () => {
      const milestone = makeGrantMilestone({
        dueDate: null,
        endsAt: 1735689600000, // milliseconds
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].endsAt).toBe(1735689600);
    });
  });

  describe("grant updates", () => {
    it("converts a grant update to unified format", () => {
      const update = makeGrantUpdate({
        uid: "gu-42",
        title: "Progress Update",
        text: "Making progress",
        grant: { uid: "grant-1", title: "My Grant" },
      });
      const result = convertToUnifiedMilestones({ ...emptyResponse, grantUpdates: [update] });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uid: "gu-42",
        type: "grant_update",
        title: "Progress Update",
        description: "Making progress",
      });
    });

    it("uses attester fallback for grant updates", () => {
      const update = makeGrantUpdate({
        recipient: "",
        attester: "0xUpdateAttester",
      });
      const result = convertToUnifiedMilestones({ ...emptyResponse, grantUpdates: [update] });

      expect(result[0].grantUpdate).toMatchObject({
        recipient: "0xUpdateAttester",
        attester: "0xUpdateAttester",
      });
    });
  });

  describe("edge cases", () => {
    it("treats pending status as not completed even when completionDetails present", () => {
      const milestone = makeGrantMilestone({
        status: "pending",
        completionDetails: {
          description: "Stale data",
          completedAt: "2025-03-01T00:00:00.000Z",
          completedBy: "0xStale",
          proofOfWork: "https://stale.link",
        },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        grantMilestones: [milestone],
      });

      expect(result[0].completed).toBe(false);
    });

    it("treats pending project milestone as not completed even with completionDetails", () => {
      const milestone = makeProjectMilestone({
        status: "pending",
        completionDetails: {
          description: "Stale",
          completedAt: "2025-03-01T00:00:00.000Z",
          completedBy: "0xStale",
        },
      });
      const result = convertToUnifiedMilestones({
        ...emptyResponse,
        projectMilestones: [milestone],
      });

      expect(result[0].completed).toBe(false);
    });
  });

  describe("mixed response", () => {
    it("combines all item types", () => {
      const response: UpdatesApiResponse = {
        projectUpdates: [makeProjectUpdate()],
        projectMilestones: [makeProjectMilestone()],
        grantMilestones: [makeGrantMilestone()],
        grantUpdates: [makeGrantUpdate()],
      };
      const result = convertToUnifiedMilestones(response);

      expect(result).toHaveLength(4);
      const types = result.map((r) => r.type);
      expect(types).toContain("activity");
      expect(types).toContain("milestone");
      expect(types).toContain("grant");
      expect(types).toContain("grant_update");
    });
  });
});
