import { z } from "zod";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const NonNegativeNumberSchema = z.number().nonnegative();
const PercentageSchema = z.number().min(0).max(100);

// The metrics endpoint is shared with other consumers and may gain fields.
// Passthrough keeps this reader forward-compatible while still validating
// every value used to publish a chart.
export const NotebookProgramFundingDtoSchema = z
  .object({
    programId: z.string().min(1),
    programName: z.string().min(1),
    primaryCurrency: z.string(),
    totalAllocated: NonNegativeNumberSchema,
    totalDisbursed: NonNegativeNumberSchema,
    totalRemaining: NonNegativeNumberSchema,
    projectCount: NonNegativeIntegerSchema,
    avgMilestoneCompletion: PercentageSchema.nullable(),
  })
  .passthrough();

export const NotebookTrackFundingDtoSchema = z
  .object({
    trackId: z.string().nullable(),
    track: z.string().nullable(),
    allocated: NonNegativeNumberSchema,
    disbursed: NonNegativeNumberSchema,
    projects: NonNegativeIntegerSchema,
    avgMilestoneCompletion: PercentageSchema.nullable(),
  })
  .passthrough();

export const NotebookFundingTotalsDtoSchema = z
  .object({
    allocated: NonNegativeNumberSchema,
    disbursed: NonNegativeNumberSchema,
    remaining: NonNegativeNumberSchema,
    programs: NonNegativeIntegerSchema,
    distinctProjects: NonNegativeIntegerSchema,
    avgMilestoneCompletion: PercentageSchema.nullable(),
    currencies: z.array(z.string()),
  })
  .passthrough();

export const NotebookCommunityMetricsDtoSchema = z
  .object({
    communityUID: z.string().min(1),
    totalPrograms: NonNegativeIntegerSchema,
    enabledPrograms: NonNegativeIntegerSchema,
    totalApplications: NonNegativeIntegerSchema,
    approvedApplications: NonNegativeIntegerSchema,
    rejectedApplications: NonNegativeIntegerSchema,
    pendingApplications: NonNegativeIntegerSchema,
    underReviewApplications: NonNegativeIntegerSchema,
    funding: z
      .object({
        programs: z.array(NotebookProgramFundingDtoSchema),
        byTrack: z.array(NotebookTrackFundingDtoSchema),
        totals: NotebookFundingTotalsDtoSchema,
      })
      .passthrough(),
  })
  .passthrough();

export const NotebookCommunityStatsDtoSchema = z
  .object({
    totalProjects: NonNegativeIntegerSchema,
    totalMilestones: NonNegativeIntegerSchema,
    projectUpdatesBreakdown: z
      .object({
        projectCompletedMilestones: NonNegativeIntegerSchema,
        grantCompletedMilestones: NonNegativeIntegerSchema,
      })
      .passthrough(),
  })
  .passthrough()
  .superRefine((stats, context) => {
    const completed =
      stats.projectUpdatesBreakdown.projectCompletedMilestones +
      stats.projectUpdatesBreakdown.grantCompletedMilestones;

    if (completed > stats.totalMilestones) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectUpdatesBreakdown"],
        message: "completed milestones cannot exceed total milestones",
      });
    }
  });

export type NotebookProgramFundingDto = z.infer<typeof NotebookProgramFundingDtoSchema>;
export type NotebookTrackFundingDto = z.infer<typeof NotebookTrackFundingDtoSchema>;
export type NotebookFundingTotalsDto = z.infer<typeof NotebookFundingTotalsDtoSchema>;
export type NotebookCommunityMetricsDto = z.infer<typeof NotebookCommunityMetricsDtoSchema>;
export type NotebookCommunityStatsDto = z.infer<typeof NotebookCommunityStatsDtoSchema>;
