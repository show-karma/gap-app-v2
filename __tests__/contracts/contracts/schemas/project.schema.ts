import { z } from "zod";
import { paginationInfoSchema } from "./shared.schema";

export const projectDetailsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  missionSummary: z.string().optional(),
  locationOfImpact: z.string().optional(),
  slug: z.string(),
  logoUrl: z.string().optional(),
  businessModel: z.string().optional(),
  stageIn: z.string().optional(),
  raisedMoney: z.string().optional(),
  pathToTake: z.string().optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
  lastDetailsUpdate: z.string().optional(),
});

export const projectStatsSchema = z.object({
  grantsCount: z.number(),
  grantMilestonesCount: z.number(),
  roadmapItemsCount: z.number(),
});

export const projectSchema = z.object({
  uid: z.string().startsWith("0x"),
  chainID: z.number(),
  owner: z.string().startsWith("0x"),
  payoutAddress: z.string().optional(),
  chainPayoutAddress: z.record(z.string(), z.string()).optional(),
  details: projectDetailsSchema,
  external: z
    .object({
      gitcoin: z.array(z.unknown()).optional(),
      oso: z.array(z.unknown()).optional(),
      divvi_wallets: z.array(z.unknown()).optional(),
      github: z.array(z.unknown()).optional(),
      network_addresses: z.array(z.unknown()).optional(),
      network_addresses_verified: z
        .array(
          z.object({
            network: z.string(),
            address: z.string(),
            verified: z.boolean(),
            verifiedAt: z.string().optional(),
            verifiedBy: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  members: z.array(
    z.object({
      address: z.string(),
      role: z.string(),
      joinedAt: z.string(),
    })
  ),
  endorsements: z.array(z.unknown()).optional(),
  communities: z.array(z.string()).optional(),
  symlinks: z.array(z.unknown()).optional(),
  pointers: z
    .array(
      z.object({
        uid: z.string(),
        originalProjectUID: z.string(),
        createdAt: z.string(),
      })
    )
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  stats: projectStatsSchema.optional(),
});

export const paginatedProjectsResponseSchema = z.object({
  payload: z.array(projectSchema),
  pagination: paginationInfoSchema,
});
