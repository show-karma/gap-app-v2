import { z } from "zod";

const NonNegativeIntegerSchema = z.number().int().nonnegative();
const NonNegativeNumberSchema = z.number().nonnegative();
const PercentageSchema = z.number().min(0).max(100);
const NullablePercentageSchema = PercentageSchema.nullable();
const IsoTimestampSchema = z.string().datetime({ offset: true });

const NotebookKernelSlaDtoSchema = z
  .object({
    scored: NonNegativeIntegerSchema,
    passed: NonNegativeIntegerSchema,
    metPct: NullablePercentageSchema,
  })
  .passthrough()
  .superRefine((sla, context) => {
    if (sla.passed > sla.scored) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passed"],
        message: "passed readings cannot exceed scored readings",
      });
    }
    if (sla.scored === 0 && sla.metPct !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metPct"],
        message: "an unscored SLA must not publish a percentage",
      });
    }
    if (sla.scored > 0 && sla.metPct === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metPct"],
        message: "a scored SLA must publish its percentage",
      });
    }
  });

const NotebookKernelCoverageDtoSchema = z
  .object({
    received: NonNegativeIntegerSchema,
    expected: NonNegativeIntegerSchema,
    pct: NullablePercentageSchema,
  })
  .passthrough()
  .superRefine((coverage, context) => {
    if (coverage.received > coverage.expected) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["received"],
        message: "received periods cannot exceed expected periods",
      });
    }
    if (coverage.expected === 0 && coverage.pct !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pct"],
        message: "coverage without expected periods must be null",
      });
    }
  });

export const NotebookKernelTierIdDtoSchema = z.enum([
  "irreplaceable",
  "essential",
  "important",
  "nice-to-have",
]);

export const NotebookKernelTierDtoSchema = z
  .object({
    tier: NotebookKernelTierIdDtoSchema,
    description: z.string(),
    fundingPosture: z.string(),
    catalogued: NonNegativeIntegerSchema,
    inScope: NonNegativeIntegerSchema,
    measured: NonNegativeIntegerSchema,
    commitments: NonNegativeIntegerSchema,
    projects: NonNegativeIntegerSchema,
    readings: NonNegativeIntegerSchema,
    lastReadingAt: IsoTimestampSchema.nullable(),
    sla: NotebookKernelSlaDtoSchema,
    coverage: NotebookKernelCoverageDtoSchema,
  })
  .passthrough();

export const NotebookKernelOverviewDtoSchema = z
  .object({
    windowDays: z.number().int().min(1).max(365),
    scored: z.boolean(),
    program: z
      .object({
        committedUsd: NonNegativeNumberSchema,
        disbursedUsd: NonNegativeNumberSchema,
        fundedGrants: NonNegativeIntegerSchema,
        functionsInScope: NonNegativeIntegerSchema,
        functionsMeasured: NonNegativeIntegerSchema,
        measurementCoveragePct: NullablePercentageSchema,
        unmeasuredInScope: NonNegativeIntegerSchema,
        healthMet: NotebookKernelSlaDtoSchema,
        coverage: NotebookKernelCoverageDtoSchema,
        singleMaintainerCritical: NonNegativeIntegerSchema,
        projectsReporting: NonNegativeIntegerSchema,
      })
      .passthrough(),
    tiers: z.array(NotebookKernelTierDtoSchema).length(4),
  })
  .passthrough()
  .superRefine((overview, context) => {
    if (new Set(overview.tiers.map((tier) => tier.tier)).size !== overview.tiers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tiers"],
        message: "kernel tiers must be unique",
      });
    }
    if (overview.scored !== overview.program.healthMet.scored > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scored"],
        message: "scored must agree with the pooled SLA denominator",
      });
    }
  });

export const NotebookKernelFunctionDtoSchema = z
  .object({
    kernelId: z.string().trim().min(1).max(200),
    kernelFunction: z.string().trim().min(1).max(500),
    tier: NotebookKernelTierIdDtoSchema,
    category: z.string().max(200),
    subCategory: z.string().max(200),
    kernelValue: z.string().max(2_000),
    isInScope: z.boolean(),
    maintainers: NonNegativeIntegerSchema,
    measured: z.boolean(),
    commitments: NonNegativeIntegerSchema,
    projectsReporting: NonNegativeIntegerSchema,
    readings: NonNegativeIntegerSchema,
    lastReadingAt: IsoTimestampSchema.nullable(),
    sla: NotebookKernelSlaDtoSchema,
    coverage: NotebookKernelCoverageDtoSchema,
    collectingSince: IsoTimestampSchema.nullable(),
  })
  .passthrough();

export const NotebookKernelFunctionsDtoSchema = z
  .object({
    windowDays: z.number().int().min(1).max(365),
    functions: z.array(NotebookKernelFunctionDtoSchema).max(1_000),
  })
  .passthrough()
  .superRefine((response, context) => {
    if (
      new Set(response.functions.map((entry) => entry.kernelId)).size !== response.functions.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["functions"],
        message: "kernel function ids must be unique",
      });
    }
  });

export type NotebookKernelOverviewDto = z.infer<typeof NotebookKernelOverviewDtoSchema>;
export type NotebookKernelTierDto = z.infer<typeof NotebookKernelTierDtoSchema>;
export type NotebookKernelFunctionDto = z.infer<typeof NotebookKernelFunctionDtoSchema>;
export type NotebookKernelFunctionsDto = z.infer<typeof NotebookKernelFunctionsDtoSchema>;
