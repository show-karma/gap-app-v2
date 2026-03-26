import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";
import { urlRegex } from "@/utilities/regexs/urlRegex";

/**
 * Preprocessor for optional numeric fields.
 * z.coerce.number().optional() coerces "" to 0 instead of undefined.
 * This handles empty strings and undefined correctly by converting them to undefined.
 */
const optionalNumber = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z.number().optional()
);

export const OPPORTUNITY_TYPE_OPTIONS = [
  { value: "grant", label: "Grant" },
  { value: "hackathon", label: "Hackathon" },
  { value: "bounty", label: "Bounty" },
  { value: "accelerator", label: "Accelerator" },
  { value: "vc_fund", label: "VC Fund" },
  { value: "rfp", label: "RFP" },
] as const;

// --- Type-specific metadata sub-schemas ---
// Fields that are conditionally required (enforced in superRefine for the active type)
// use .default("") instead of .optional() to avoid schema/validation contradiction.
export const hackathonMetadataSchema = z
  .object({
    location: z.string().default(""),
    tracks: z.string().optional(),
    prizePool: optionalNumber,
    prizeCurrency: z.string().optional(),
    registrationDeadline: z.date().optional(),
    teamSizeMin: optionalNumber,
    teamSizeMax: optionalNumber,
  })
  .optional();

export const bountyMetadataSchema = z
  .object({
    rewardAmount: optionalNumber,
    rewardCurrency: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    skills: z.string().optional(),
    platform: z.string().optional(),
  })
  .optional();

export const acceleratorMetadataSchema = z
  .object({
    stage: z.enum(["pre-seed", "seed", "series-a"]).optional(),
    equity: z.string().optional(),
    fundingAmount: optionalNumber,
    fundingCurrency: z.string().optional(),
    programDuration: optionalNumber,
    batchSize: optionalNumber,
    location: z.string().optional(),
  })
  .optional();

export const vcFundMetadataSchema = z
  .object({
    stage: z.enum(["pre-seed", "seed", "series-a", "series-b+"]).optional(),
    checkSizeMin: optionalNumber,
    checkSizeMax: optionalNumber,
    checkSizeCurrency: z.string().optional(),
    thesis: z.string().optional(),
    portfolio: z.string().optional(),
    contactMethod: z.enum(["email", "form", "intro-only"]).optional(),
    activelyInvesting: z.boolean().optional(),
  })
  .optional();

export const rfpMetadataSchema = z
  .object({
    issuingOrganization: z.string().default(""),
    budgetAmount: optionalNumber,
    budgetCurrency: z.string().optional(),
    scope: z.string().optional(),
    requirements: z.string().optional(),
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
    grantsSite: z
      .string()
      .refine((value) => urlRegex.test(value), {
        message: "Please enter a valid URL",
      })
      .optional()
      .or(z.literal("")),
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
    amountDistributed: optionalNumber,
    description: z
      .string({
        required_error: MESSAGES.REGISTRY.FORM.DESCRIPTION,
      })
      .min(3, {
        message: MESSAGES.REGISTRY.FORM.DESCRIPTION,
      }),
    networkToCreate: optionalNumber,
    budget: optionalNumber,
    minGrantSize: optionalNumber,
    maxGrantSize: optionalNumber,
    grantsToDate: optionalNumber,
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
      if (!data.hackathonMeta?.location?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Location is required for hackathons",
          path: ["hackathonMeta", "location"],
        });
      }
    }
    if (data.opportunityType === "bounty") {
      if (data.bountyMeta?.rewardAmount == null || data.bountyMeta.rewardAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reward amount is required for bounties",
          path: ["bountyMeta", "rewardAmount"],
        });
      }
    }
    if (data.opportunityType === "rfp") {
      if (!data.rfpMeta?.issuingOrganization?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Issuing organization is required for RFPs",
          path: ["rfpMeta", "issuingOrganization"],
        });
      }
    }
  });

/**
 * Returns the public program schema, optionally with required email validation.
 * When `requireEmails` is true (admin context), both adminEmails and financeEmails
 * must have at least one entry.
 */
export function getCreateProgramSchema(options?: { requireEmails?: boolean }) {
  if (!options?.requireEmails) return createProgramSchema;
  return createProgramSchema.superRefine((data, ctx) => {
    if (!data.adminEmails || data.adminEmails.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one admin email is required",
        path: ["adminEmails"],
      });
    }
    if (!data.financeEmails || data.financeEmails.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one finance email is required",
        path: ["financeEmails"],
      });
    }
  });
}

export type ProgramFormData = z.infer<typeof createProgramSchema>;
