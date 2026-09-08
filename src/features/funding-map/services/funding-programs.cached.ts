import "server-only";

import type { DehydratedState } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { buildDehydratedState } from "@/utilities/cache/hydration-seed";
import { programListTag } from "@/utilities/cache/tags";
import { DEFAULT_FUNDING_MAP_API_PARAMS, fundingProgramsKeys } from "../constants/query-keys";
import type { PaginatedFundingPrograms } from "../types/funding-program";
import { fundingProgramsService } from "./funding-programs.service";

/**
 * Cached, server-only read of the program-registry list, and the `/funding-map`
 * hydration seed built from it.
 *
 * The list read is module-local: the page consumes the seed, not the list, so
 * exporting it would leave a second entry point nobody calls.
 *
 * The whitelabel program detail page caches its own inline fetch instead: it
 * already passed `isAuthorized: false` and lives in the page, so routing it
 * through here would add an indirection without adding anything.
 *
 * `fundingProgramsService` itself stays uncached: three client hooks import it
 * (`useFundingOpportunities`, `useFundingOpportunitiesCount`,
 * `use-funding-programs`), and a `"use cache"` function cannot be called from
 * the client. See the note in `getCommunityData.cached.ts`.
 *
 * `cacheLife("minutes")` — `{ stale: 300, revalidate: 60, expire: 3600 }`. The
 * registry is editorial data that changes on a human cadence, so the minutes
 * tier is the right ceiling; the tags are what a webhook would use to beat it.
 */

async function getAllFundingProgramsCached(
  params: Parameters<typeof fundingProgramsService.getAll>[0] = {}
): Promise<PaginatedFundingPrograms> {
  "use cache";
  cacheLife("minutes");
  cacheTag(programListTag());

  return fundingProgramsService.getAll(params);
}

/**
 * The `/funding-map` hydration seed, cached whole.
 *
 * `cacheLife` and `cacheTag` match `getAllFundingProgramsCached` exactly, so the
 * seed and the data it carries can never disagree about how long they live or
 * what invalidates them.
 */
export async function getFundingMapSeedCached(): Promise<DehydratedState> {
  "use cache";
  cacheLife("minutes");
  cacheTag(programListTag());

  return buildDehydratedState(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: fundingProgramsKeys.list(DEFAULT_FUNDING_MAP_API_PARAMS),
      queryFn: () => getAllFundingProgramsCached(DEFAULT_FUNDING_MAP_API_PARAMS),
    });
  });
}
