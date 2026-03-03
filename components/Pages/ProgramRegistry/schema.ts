import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";

export const OPPORTUNITY_TYPE_OPTIONS = [
  { value: "grant", label: "Grant" },
  { value: "hackathon", label: "Hackathon" },
  { value: "bounty", label: "Bounty" },
  { value: "accelerator", label: "Accelerator" },
  { value: "vc_fund", label: "VC Fund" },
  { value: "rfp", label: "RFP" },
] as const;

// --- Type-specific metadata sub-schemas ---
export const hackathonMetadataSchema = z
  .object({
    location: z.string().min(1, "Location is required").or(z.literal("")),
    tracks: z.string().optional().or(z.literal("")),
    prizePool: z.coerce.number().optional(),
    prizeCurrency: z.string().optional().or(z.literal("USD")),
    registrationDeadline: z.date().optional(),
    teamSizeMin: z.coerce.number().optional(),
    teamSizeMax: z.coerce.number().optional(),
  })
  .optional();

export const bountyMetadataSchema = z
  .object({
    rewardAmount: z.coerce.number().min(1, "Reward amount is required"),
    rewardCurrency: z.string().optional().or(z.literal("USD")),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    skills: z.string().optional().or(z.literal("")),
    platform: z.string().optional().or(z.literal("")),
  })
  .optional();

export const acceleratorMetadataSchema = z
  .object({
    stage: z.enum(["pre-seed", "seed", "series-a"]).optional(),
    equity: z.string().optional().or(z.literal("")),
    fundingAmount: z.coerce.number().optional(),
    fundingCurrency: z.string().optional().or(z.literal("USD")),
    programDuration: z.coerce.number().optional(),
    batchSize: z.coerce.number().optional(),
    location: z.string().optional().or(z.literal("")),
  })
  .optional();

export const vcFundMetadataSchema = z
  .object({
    stage: z.enum(["pre-seed", "seed", "series-a", "series-b+"]).optional(),
    checkSizeMin: z.coerce.number().optional(),
    checkSizeMax: z.coerce.number().optional(),
    checkSizeCurrency: z.string().optional().or(z.literal("USD")),
    thesis: z.string().optional().or(z.literal("")),
    portfolio: z.string().optional().or(z.literal("")),
    contactMethod: z.enum(["email", "form", "intro-only"]).optional(),
    activelyInvesting: z.boolean().optional(),
  })
  .optional();

export const rfpMetadataSchema = z
  .object({
    issuingOrganization: z.string().min(1, "Issuing organization is required"),
    budgetAmount: z.coerce.number().optional(),
    budgetCurrency: z.string().optional().or(z.literal("USD")),
    scope: z.string().optional().or(z.literal("")),
    requirements: z.string().optional().or(z.literal("")),
  })
  .optional();

export const createProgramSchema = z
  .object({
    opportunityType: z
      .enum(["grant", "hackathon", "bounty", "accelerator", "vc_fund", "rfp"])
      .default("grant"),
    deadline: z.date().optional(),
    submissionUrl: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    // Type-specific metadata
    hackathonMeta: hackathonMetadataSchema,
    bountyMeta: bountyMetadataSchema,
    acceleratorMeta: acceleratorMetadataSchema,
    vcFundMeta: vcFundMetadataSchema,
    rfpMeta: rfpMetadataSchema,
    name: z
      .string()
      .min(3, { message: MESSAGES.REGISTRY.FORM.NAME.MIN })
      .max(50, { message: MESSAGES.REGISTRY.FORM.NAME.MAX }),
    dates: z
      .object({
        endsAt: z.date().optional(),
        startsAt: z.date().optional(),
      })
      .refine(
        (data) => {
          if (!data.endsAt || !data.startsAt) return true;
          const endsAt = data.endsAt.getTime() / 1000;
          const startsAt = data.startsAt.getTime() / 1000;
          return startsAt ? startsAt <= endsAt : true;
        },
        {
          message: "Start date must be before the end date",
          path: ["startsAt"],
        }
      ),
    website: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    twitter: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    discord: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    orgWebsite: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    blog: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    forum: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    grantsSite: z.string().refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    }),
    bugBounty: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    telegram: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    facebook: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    instagram: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
    shortDescription: z
      .string()
      .max(100, { message: "Short description must be at most 100 characters" })
      .optional()
      .or(z.literal("")),
    amountDistributed: z.coerce.number().optional(),
    description: z
      .string({
        required_error: MESSAGES.REGISTRY.FORM.DESCRIPTION,
      })
      .min(3, {
        message: MESSAGES.REGISTRY.FORM.DESCRIPTION,
      }),
    networkToCreate: z.coerce.number().optional(),
    budget: z.coerce.number().optional(),
    minGrantSize: z.coerce.number().optional(),
    maxGrantSize: z.coerce.number().optional(),
    grantsToDate: z.coerce.number().optional(),
    categories: z.array(z.string()),
    organizations: z.array(z.string()),
    ecosystems: z.array(z.string()),
    networks: z.array(z.string()),
    grantTypes: z.array(z.string()),
    platformsUsed: z.array(z.string()),
    communityRef: z.array(z.string()),
    anyoneCanJoin: z.boolean(),
    status: z.string().optional().or(z.literal("Active")),
    adminEmails: z
      .array(z.string().email({ message: "Invalid email address" }))
      .optional()
      .default([]),
    financeEmails: z
      .array(z.string().email({ message: "Invalid email address" }))
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.opportunityType === "hackathon") {
      if (!data.dates.startsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date is required for hackathons",
          path: ["dates", "startsAt"],
        });
      }
      if (!data.dates.endsAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date is required for hackathons",
          path: ["dates", "endsAt"],
        });
      }
      if (!data.hackathonMeta?.location) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Location is required for hackathons",
          path: ["hackathonMeta", "location"],
        });
      }
    }
    if (data.opportunityType === "bounty") {
      if (!data.bountyMeta?.rewardAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reward amount is required for bounties",
          path: ["bountyMeta", "rewardAmount"],
        });
      }
    }
    if (data.opportunityType === "rfp") {
      if (!data.rfpMeta?.issuingOrganization) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Issuing organization is required for RFPs",
          path: ["rfpMeta", "issuingOrganization"],
        });
      }
    }
  });

export type ProgramFormData = z.infer<typeof createProgramSchema>;
