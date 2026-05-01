import { z } from "zod";
import { paginationInfoSchema } from "./shared.schema";

export const communityDetailsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  logoUrl: z.string().optional(),
  imageURL: z.string().optional(),
});

export const communitySchema = z.object({
  uid: z.string().startsWith("0x"),
  chainID: z.number(),
  details: communityDetailsSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const projectUpdatesBreakdownSchema = z.object({
  projectMilestones: z.number(),
  projectCompletedMilestones: z.number(),
  projectUpdates: z.number(),
  grantMilestones: z.number(),
  grantCompletedMilestones: z.number(),
  grantUpdates: z.number(),
});

export const communityStatsSchema = z.object({
  totalProjects: z.number(),
  totalGrants: z.number(),
  totalMilestones: z.number(),
  projectUpdates: z.number(),
  projectUpdatesBreakdown: projectUpdatesBreakdownSchema,
  totalTransactions: z.number(),
  averageCompletion: z.number(),
});

export const communityProjectSchema = z.object({
  uid: z.string(),
  details: z.object({
    title: z.string(),
    description: z.string(),
    logoUrl: z.string(),
    slug: z.string(),
  }),
  categories: z.array(z.string()),
  regions: z.array(z.string()),
  grantNames: z.array(z.string()),
  members: z.array(
    z.object({
      address: z.string(),
      role: z.string(),
      joinedAt: z.string(),
    })
  ),
  links: z.array(z.object({ url: z.string(), type: z.string() })),
  endorsements: z.array(
    z.object({
      endorser: z.string(),
      endorsement: z.string(),
      createdAt: z.string(),
    })
  ),
  contractAddresses: z.array(z.string()),
  chainPayoutAddress: z.record(z.string(), z.string()).optional(),
  numMilestones: z.number(),
  numCompletedMilestones: z.number(),
  numUpdates: z.number(),
  percentCompleted: z.number(),
  numTransactions: z.number(),
  createdAt: z.string(),
});

export const communityProjectsResponseSchema = z.object({
  payload: z.array(communityProjectSchema),
  pagination: paginationInfoSchema,
});
