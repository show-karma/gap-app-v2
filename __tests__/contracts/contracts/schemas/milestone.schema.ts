import { z } from "zod";

export const verificationSchema = z.object({
  uid: z.string(),
  attester: z.string(),
  reason: z.string().optional(),
  createdAt: z.string(),
});

export const milestoneCompletedSchema = z
  .object({
    uid: z.string().optional(),
    chainID: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    attester: z.string().optional(),
    data: z
      .object({
        reason: z.string().optional(),
        proofOfWork: z.string().optional(),
        deliverables: z
          .union([
            z.string(),
            z.array(
              z.object({
                name: z.string().optional(),
                proof: z.string().optional(),
                description: z.string().optional(),
              })
            ),
          ])
          .optional(),
        completionPercentage: z.number().optional(),
      })
      .optional(),
  })
  .nullable();

export const milestoneStatusHistorySchema = z.object({
  status: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().optional(),
  statusReason: z.string().optional(),
});

export const grantMilestoneSchema = z.object({
  uid: z.string(),
  chainID: z.number(),
  refUID: z.string().optional(),
  type: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.number().optional(),
  endsAt: z.number().optional(),
  startsAt: z.number().optional(),
  currentStatus: z.string().optional(),
  statusUpdatedAt: z.string().optional(),
  statusHistory: z.array(milestoneStatusHistorySchema).optional(),
  completed: milestoneCompletedSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  verified: z.array(verificationSchema),
  editHistory: z
    .array(
      z.object({
        previousUID: z.string(),
        editedAt: z.string(),
        editedBy: z.string(),
      })
    )
    .optional(),
  id: z.string().optional(),
  schemaUID: z.string().optional(),
  attester: z.string().optional(),
  recipient: z.string().optional(),
  revoked: z.boolean().optional(),
  revocationTime: z.number().optional(),
});
