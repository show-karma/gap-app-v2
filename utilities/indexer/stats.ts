import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { IAttestationStats, IAttestationStatsNames, StatsResponse } from "@/types";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

// The backend emits MORE series names than the frontend charts (e.g.
// `overall`, `projectPointers`) and adds new ones without a frontend
// release — so `name` must stay an open string at the boundary, with the
// service narrowing to the charted subset below. Pinning an enum here put
// the whole stats page into a silent empty state when the vocabulary grew.
const AttestationStatSchema = z.object({
  name: z.string(),
  data: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
      timestamp: z.number(),
    })
  ),
});

const StatsResponseSchema = z.array(AttestationStatSchema);

const KNOWN_STAT_NAMES: readonly string[] = [
  "milestones",
  "projects",
  "projectImpacts",
  "projectEndorsements",
  "grants",
  "communities",
  "grantUpdates",
  "milestoneUpdates",
  "totals",
] satisfies readonly IAttestationStatsNames[];

export const getGAPStats = async (): Promise<StatsResponse> => {
  try {
    const raw = await api.get(INDEXER.GAP.STATS, { schema: StatsResponseSchema });
    return raw.filter((item): item is IAttestationStats => KNOWN_STAT_NAMES.includes(item.name));
  } catch (error: unknown) {
    errorManager(`Error fetching GAP stats`, error);
    return [];
  }
};

// The /attestations/wau endpoint has its OWN shape — a raw Mongo aggregation
// row per week ({wau, previousWau, percentileChange, date: {$date}}), NOT the
// {name, data[]} series shape of /attestations/stats.
const WeeklyActiveUsersStatSchema = z
  .object({
    wau: z.number(),
    previousWau: z.number(),
    percentileChange: z.number(),
    date: z.object({ $date: z.string() }).passthrough(),
  })
  .passthrough();
const WeeklyActiveUsersSchema = z.array(WeeklyActiveUsersStatSchema);

export type WeeklyActiveUsersStat = z.infer<typeof WeeklyActiveUsersStatSchema>;

export const getGAPWeeklyActiveUsers = async (): Promise<WeeklyActiveUsersStat[]> => {
  try {
    return await api.get<WeeklyActiveUsersStat[]>(INDEXER.GAP.WEEKLY_ACTIVE_USERS, {
      schema: WeeklyActiveUsersSchema,
    });
  } catch (error: unknown) {
    errorManager(`Error fetching GAP weekly active users`, error);
    return [];
  }
};
