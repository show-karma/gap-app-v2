import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { StatsResponse } from "@/types";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

// Mirrors types/stats.ts `IAttestationStats` / `StatsResponse` exactly.
const AttestationStatSchema = z.object({
  name: z.enum([
    "milestones",
    "projects",
    "projectImpacts",
    "projectEndorsements",
    "grants",
    "communities",
    "grantUpdates",
    "milestoneUpdates",
    "totals",
  ]),
  data: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
      timestamp: z.number(),
    })
  ),
});

const StatsResponseSchema = z.array(AttestationStatSchema);

export const getGAPStats = async (): Promise<StatsResponse> => {
  try {
    return await api.get<StatsResponse>(INDEXER.GAP.STATS, { schema: StatsResponseSchema });
  } catch (error: unknown) {
    errorManager(`Error fetching GAP stats`, error);
    return [];
  }
};

export const getGAPWeeklyActiveUsers = async (): Promise<StatsResponse> => {
  try {
    return await api.get<StatsResponse>(INDEXER.GAP.WEEKLY_ACTIVE_USERS, {
      schema: StatsResponseSchema,
    });
  } catch (error: unknown) {
    errorManager(`Error fetching GAP weekly active users`, error);
    return [];
  }
};
