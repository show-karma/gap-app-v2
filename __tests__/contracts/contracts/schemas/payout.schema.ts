import { z } from "zod";
import { paginationInfoSchema } from "./shared.schema";

export const payoutDisbursementStatusSchema = z.enum([
  "CONFIGURED",
  "PENDING",
  "AWAITING_SIGNATURES",
  "DISBURSED",
  "CANCELLED",
  "FAILED",
]);

export const milestoneBreakdownSchema = z.record(z.string(), z.string());

export const payoutDisbursementSchema = z.object({
  id: z.string(),
  grantUID: z.string(),
  projectUID: z.string(),
  communityUID: z.string(),
  chainID: z.number(),
  safeAddress: z.string(),
  safeTransactionHash: z.string().nullable(),
  disbursedAmount: z.string(),
  token: z.string(),
  tokenAddress: z.string(),
  tokenDecimals: z.number(),
  payoutAddress: z.string(),
  milestoneBreakdown: milestoneBreakdownSchema.nullable(),
  paidAllocationIds: z.array(z.string()),
  status: payoutDisbursementStatusSchema,
  executedAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedDisbursementsResponseSchema = z.object({
  payload: z.array(payoutDisbursementSchema),
  pagination: paginationInfoSchema,
});

export const totalDisbursedResponseSchema = z.object({
  totalDisbursed: z.string(),
});

export const tokenTotalSchema = z.object({
  token: z.string(),
  tokenDecimals: z.number(),
  tokenAddress: z.string(),
  chainID: z.number(),
  totalAmount: z.string(),
});

export const milestoneAllocationSchema = z.object({
  id: z.string(),
  milestoneUID: z.string().optional(),
  label: z.string(),
  amount: z.string(),
});

export const payoutGrantConfigSchema = z.object({
  id: z.string(),
  grantUID: z.string(),
  projectUID: z.string(),
  communityUID: z.string(),
  payoutAddress: z.string().nullable(),
  totalGrantAmount: z.string().nullable(),
  tokenAddress: z.string().nullable(),
  chainID: z.number().nullable(),
  milestoneAllocations: z.array(milestoneAllocationSchema).nullable(),
  createdBy: z.string(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const savePayoutConfigResponseSchema = z.object({
  success: z.array(payoutGrantConfigSchema),
  failed: z.array(
    z.object({
      grantUID: z.string(),
      error: z.string(),
    })
  ),
});

export const createDisbursementsResponseSchema = z.object({
  disbursements: z.array(payoutDisbursementSchema),
});
