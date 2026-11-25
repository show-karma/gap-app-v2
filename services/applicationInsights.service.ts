import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

const TrackRecordMilestoneSchema = z.object({
  uid: z.string(),
  title: z.string(),
  dueDate: z.string().nullable(),
  currentStatus: z.string(),
  completedAt: z.string().nullable(),
  completionPercentage: z.number().nullable(),
  allocatedAmount: z.string().nullable(),
  evaluation: z.object({ rating: z.number(), evaluatedAt: z.string() }).nullable(),
  paidAmount: z.string().nullable(),
  paidAt: z.string().nullable(),
});

const TrackRecordGrantSchema = z.object({
  uid: z.string(),
  title: z.string().nullable(),
  programId: z.string().nullable(),
  isCompleted: z.boolean(),
  completedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  totalGrantAmount: z.string().nullable(),
  tokenSymbol: z.string().nullable(),
  tokenAddress: z.string().nullable(),
  chainID: z.number().nullable(),
  paidAmount: z.string().nullable(),
  paidTokenSymbol: z.string().nullable(),
  paymentCount: z.number(),
  milestones: z.array(TrackRecordMilestoneSchema),
});

const ApplicationTrackRecordSchema = z.object({
  status: z.enum(["available", "no_project_linked", "project_not_found"]),
  projectUID: z.string().nullable(),
  project: z
    .object({ uid: z.string(), slug: z.string().nullable(), title: z.string().nullable() })
    .nullable(),
  grants: z.array(TrackRecordGrantSchema),
});

export type TrackRecordMilestone = z.infer<typeof TrackRecordMilestoneSchema>;
export type TrackRecordGrant = z.infer<typeof TrackRecordGrantSchema>;
export type ApplicationTrackRecord = z.infer<typeof ApplicationTrackRecordSchema>;

const IndicatorDatapointSchema = z
  .object({
    value: z.union([z.string(), z.number()]),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    breakdown: z.string().nullable().optional(),
    thresholdOp: z.string().nullable().optional(),
    thresholdValue: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();

const ProjectIndicatorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    unitOfMeasure: z.string().nullable().optional(),
    lastUpdatedAt: z.string().nullable().optional(),
    datapoints: z.array(IndicatorDatapointSchema).default([]),
  })
  .passthrough();

const ProjectIndicatorsSchema = z
  .object({ indicators: z.array(ProjectIndicatorSchema).default([]) })
  .passthrough();

export type ProjectIndicatorDatapoint = z.infer<typeof IndicatorDatapointSchema>;
export type ProjectIndicator = z.infer<typeof ProjectIndicatorSchema>;

export async function fetchApplicationTrackRecord(
  referenceNumber: string
): Promise<ApplicationTrackRecord> {
  const data = await api.get(INDEXER.V2.FUNDING_APPLICATIONS.TRACK_RECORD(referenceNumber));
  return ApplicationTrackRecordSchema.parse(data);
}

export async function fetchProjectIndicators(projectUID: string): Promise<ProjectIndicator[]> {
  const data = await api.get(INDEXER.INDICATORS.V2.PROJECT_INDICATORS(projectUID));
  return ProjectIndicatorsSchema.parse(data).indicators;
}
