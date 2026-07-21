import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

const MetricDataSchema = z
  .object({
    lastUpdated: z.string(),
    source: z.string(),
    unit: z.string(),
    value: z.number(),
    breakdown: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();
type MetricData = z.infer<typeof MetricDataSchema>;

const ProjectImpactResponseSchema = z
  .object({
    metrics: z
      .object({
        gitCommits: MetricDataSchema.nullable(),
        mergedPRs: MetricDataSchema.nullable(),
        transactions: MetricDataSchema.nullable(),
        uniqueUsers: MetricDataSchema.nullable(),
      })
      .passthrough(),
    projectTitle: z.string().optional(),
    projectUID: z.string(),
    period: z.string(),
    timeRange: z
      .object({
        endDate: z.string(),
        startDate: z.string(),
      })
      .passthrough(),
  })
  .passthrough();
type ProjectImpactResponse = z.infer<typeof ProjectImpactResponseSchema>;

function mapRangeToPeriod(range: number): "30d" | "90d" | "180d" | "1y" {
  switch (range) {
    case 90:
      return "90d";
    case 180:
      return "180d";
    case 360:
      return "1y";
    default:
      return "30d";
  }
}

export const useProjectImpactIndicators = (projectId: string, range: number = 30) => {
  const period = mapRangeToPeriod(range);

  return useQuery({
    queryKey: ["project-impact-indicators", projectId, period],
    queryFn: () =>
      api.get<ProjectImpactResponse>(
        INDEXER.INDICATORS.V2.DASHBOARD_METRICS(projectId, { period }),
        {
          schema: ProjectImpactResponseSchema,
        }
      ),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
