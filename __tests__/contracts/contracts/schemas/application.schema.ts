import { z } from "zod";

export const fundingApplicationStatusSchema = z.enum([
  "pending",
  "under_review",
  "revision_requested",
  "approved",
  "rejected",
  "resubmitted",
]);

export const statusHistoryEntrySchema = z.object({
  status: fundingApplicationStatusSchema,
  timestamp: z.union([z.string(), z.date()]),
  reason: z.string().optional(),
});

export const fundingApplicationSchema = z.object({
  id: z.string(),
  programId: z.string(),
  chainID: z.number(),
  applicantEmail: z.string(),
  ownerAddress: z.string(),
  applicationData: z.record(z.string(), z.unknown()),
  postApprovalData: z.record(z.string(), z.unknown()).optional(),
  status: fundingApplicationStatusSchema,
  statusHistory: z.array(statusHistoryEntrySchema),
  referenceNumber: z.string(),
  submissionIP: z.string(),
  projectUID: z.string().optional(),
  aiEvaluation: z
    .object({
      evaluation: z.string().optional(),
      promptId: z.string().optional(),
    })
    .optional(),
  internalAIEvaluation: z
    .object({
      evaluation: z.string().optional(),
      promptId: z.string().optional(),
      evaluatedAt: z.union([z.string(), z.date()]).optional(),
    })
    .optional(),
  appReviewers: z.array(z.string()).optional(),
  milestoneReviewers: z.array(z.string()).optional(),
  postApprovalCompleted: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const applicationStatisticsSchema = z.object({
  totalApplications: z.number(),
  pendingApplications: z.number(),
  approvedApplications: z.number(),
  rejectedApplications: z.number(),
  revisionRequestedApplications: z.number().optional(),
  underReviewApplications: z.number().optional(),
  resubmittedApplications: z.number().optional(),
});

export const paginatedApplicationsResponseSchema = z.object({
  applications: z.array(fundingApplicationSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
