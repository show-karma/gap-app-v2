import { isAddress } from "viem";
import { z } from "zod";
import { MESSAGES } from "@/utilities/messages";

// Project details bundle four narrative fields into a single attestation. The whole
// payload is serialized for submission, and for sponsored (gasless) submissions the
// resulting operation must fit under the bundler's gas limit — cost scales ~linearly
// with the combined length. Cap the four fields together, not individually, since gas
// is driven by their sum.
export const PROJECT_DETAILS_MAX_LENGTH = 15000;

// Only surface the per-field live character counter as a field approaches the cap,
// so shorter fields stay uncluttered.
export const PROJECT_DETAILS_COUNTER_THRESHOLD = 10000;

export const projectSchema = z
  .object({
    title: z
      .string()
      .min(3, { message: MESSAGES.PROJECT_FORM.TITLE.MIN })
      .max(50, { message: MESSAGES.PROJECT_FORM.TITLE.MAX }),
    chainID: z.number({
      error: "Network is required",
    }),
    locationOfImpact: z.string().optional(),
    description: z.string().min(1, {
      message: "Description is required",
    }),
    problem: z.string().min(1, {
      message: "Problem is required",
    }),
    solution: z.string().min(1, {
      message: "Solution is required",
    }),
    missionSummary: z.string().min(1, {
      message: "Mission Summary is required",
    }),
    recipient: z
      .string()
      .optional()
      .refine(
        (input) => !input || input?.length === 0 || isAddress(input),
        MESSAGES.PROJECT_FORM.RECIPIENT
      ),
    // tags: z.custom<string>(
    //   (input) =>
    //     (input as string).split(',').every((field) => field.trim().length >= 3),
    //   MESSAGES.PROJECT_FORM.TAGS
    // ),
    twitter: z
      .string()
      .refine((value) => !value.includes("@"), {
        message: MESSAGES.PROJECT_FORM.SOCIALS.TWITTER,
      })
      .optional(),
    github: z.string().optional(),
    discord: z.string().optional(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    pitchDeck: z.string().optional(),
    demoVideo: z.string().optional(),
    farcaster: z.string().optional(),
    profilePicture: z.string().optional(),
    businessModel: z.string().optional(),
    stageIn: z.string().optional(),
    raisedMoney: z.string().optional(),
    pathToTake: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const lengths = {
      description: data.description?.length ?? 0,
      problem: data.problem?.length ?? 0,
      solution: data.solution?.length ?? 0,
      missionSummary: data.missionSummary?.length ?? 0,
    };
    const total = lengths.description + lengths.problem + lengths.solution + lengths.missionSummary;
    if (total > PROJECT_DETAILS_MAX_LENGTH) {
      // Surface the error on the longest field so the user knows what to trim.
      const longestField = (Object.keys(lengths) as (keyof typeof lengths)[]).reduce((a, b) =>
        lengths[b] > lengths[a] ? b : a
      );
      ctx.addIssue({
        code: "custom",
        path: [longestField],
        message: MESSAGES.PROJECT_FORM.DETAILS_MAX,
      });
    }
  });

export type SchemaType = z.infer<typeof projectSchema>;
