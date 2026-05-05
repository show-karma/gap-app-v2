/**
 * Application API Contract Tests
 *
 * Validates that application factory output conforms to the Zod contract
 * schemas, catching shape drift between factories, schemas, and the
 * actual funding application API responses.
 */
import { describe, expect, it } from "vitest";
import {
  applicationStatisticsSchema,
  fundingApplicationSchema,
  fundingApplicationStatusSchema,
  paginatedApplicationsResponseSchema,
  statusHistoryEntrySchema,
} from "../contracts/contracts/schemas/application.schema";
import {
  approvedApplication,
  createApplicationList,
  createMockApplication,
  rejectedApplication,
  submittedApplication,
} from "../factories/application.factory";

describe("Application API Contract", () => {
  describe("factory output conforms to schema", () => {
    it("default factory output passes schema validation", () => {
      const mock = createMockApplication();
      const result = fundingApplicationSchema.safeParse(mock);
      if (!result.success) {
      }
      expect(result.success).toBe(true);
    });

    it("approved application preset passes validation", () => {
      const mock = approvedApplication();
      const result = fundingApplicationSchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("rejected application preset passes validation", () => {
      const mock = rejectedApplication();
      const result = fundingApplicationSchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("submitted (under_review) application preset passes validation", () => {
      const mock = submittedApplication();
      const result = fundingApplicationSchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("application list factory produces valid items", () => {
      const list = createApplicationList(5);
      expect(list).toHaveLength(5);

      for (const app of list) {
        const result = fundingApplicationSchema.safeParse(app);
        expect(result.success).toBe(true);
      }
    });

    it("multiple factory calls produce unique, valid data", () => {
      const mocks = Array.from({ length: 5 }, () => createMockApplication());
      const ids = new Set(mocks.map((m) => m.id));
      expect(ids.size).toBe(5);

      for (const mock of mocks) {
        const result = fundingApplicationSchema.safeParse(mock);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("required fields validation", () => {
    it("rejects when id is missing", () => {
      const { id, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when programId is missing", () => {
      const { programId, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when applicantEmail is missing", () => {
      const { applicantEmail, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when ownerAddress is missing", () => {
      const { ownerAddress, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when status is missing", () => {
      const { status, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when statusHistory is missing", () => {
      const { statusHistory, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when referenceNumber is missing", () => {
      const { referenceNumber, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when submissionIP is missing", () => {
      const { submissionIP, ...rest } = createMockApplication();
      const result = fundingApplicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe("field type validation", () => {
    it("rejects invalid status value", () => {
      const result = fundingApplicationStatusSchema.safeParse("invalid_status");
      expect(result.success).toBe(false);
    });

    it("accepts all valid status values", () => {
      const validStatuses = [
        "pending",
        "under_review",
        "revision_requested",
        "approved",
        "rejected",
        "resubmitted",
      ];
      for (const status of validStatuses) {
        const result = fundingApplicationStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it("rejects non-number chainID", () => {
      const mock = createMockApplication();
      const result = fundingApplicationSchema.safeParse({
        ...mock,
        chainID: "ten",
      });
      expect(result.success).toBe(false);
    });

    it("validates statusHistory entries individually", () => {
      const mock = createMockApplication();
      for (const entry of mock.statusHistory) {
        const result = statusHistoryEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      }
    });

    it("accepts optional fields when present", () => {
      const mock = createMockApplication();
      const result = fundingApplicationSchema.safeParse({
        ...mock,
        projectUID: "0xproject123",
        appReviewers: ["0xreviewer1", "0xreviewer2"],
        milestoneReviewers: ["0xreviewer3"],
        postApprovalCompleted: true,
        aiEvaluation: { evaluation: "Strong proposal", promptId: "prompt-1" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("paginated response validation", () => {
    it("validates a paginated applications response", () => {
      const apps = createApplicationList(3);
      const result = paginatedApplicationsResponseSchema.safeParse({
        applications: apps,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });
      expect(result.success).toBe(true);
    });

    it("validates empty paginated response", () => {
      const result = paginatedApplicationsResponseSchema.safeParse({
        applications: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
      expect(result.success).toBe(true);
    });

    it("validates application statistics schema", () => {
      const result = applicationStatisticsSchema.safeParse({
        totalApplications: 50,
        pendingApplications: 10,
        approvedApplications: 25,
        rejectedApplications: 15,
      });
      expect(result.success).toBe(true);
    });

    it("accepts statistics with optional breakdown fields", () => {
      const result = applicationStatisticsSchema.safeParse({
        totalApplications: 50,
        pendingApplications: 10,
        approvedApplications: 25,
        rejectedApplications: 15,
        underReviewApplications: 5,
        resubmittedApplications: 3,
        revisionRequestedApplications: 2,
      });
      expect(result.success).toBe(true);
    });
  });
});
