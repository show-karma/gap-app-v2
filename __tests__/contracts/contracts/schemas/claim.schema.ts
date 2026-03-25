import { z } from "zod";

export const claimEligibilitySchema = z.object({
  eligible: z.boolean(),
  proof: z.array(z.string()),
  amount: z.string(),
  claimFee: z.string(),
  tokenSymbol: z.string(),
  tokenDecimals: z.number(),
  reason: z.string().optional(),
});

export const claimCampaignSchema = z.object({
  campaignId: z.string(),
  networkName: z.string(),
  chainId: z.number(),
  contractAddress: z.string(),
  tokenAddress: z.string(),
  tokenSymbol: z.string(),
  tokenDecimals: z.number(),
  totalAllocation: z.string(),
  claimedAmount: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
});

export const claimConfigSchema = z.object({
  campaignId: z.string(),
  userAddress: z.string(),
  eligibility: claimEligibilitySchema,
  campaign: claimCampaignSchema,
});
