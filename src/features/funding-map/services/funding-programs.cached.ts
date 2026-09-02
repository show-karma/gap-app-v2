import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { programListTag } from "@/utilities/cache/tags";
import type { PaginatedFundingPrograms } from "../types/funding-program";
import { fundingProgramsService } from "./funding-programs.service";

/**
 * Cached, server-only twin of the program-registry list read — the
 * `/funding-map` SSR prefetch.
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

export async function getAllFundingProgramsCached(
  params: Parameters<typeof fundingProgramsService.getAll>[0] = {}
): Promise<PaginatedFundingPrograms> {
  "use cache";
  cacheLife("minutes");
  cacheTag(programListTag());

  return fundingProgramsService.getAll(params);
}
