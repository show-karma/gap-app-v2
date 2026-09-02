import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { programListTag, programTag } from "@/utilities/cache/tags";
import type { FundingProgramResponse, PaginatedFundingPrograms } from "../types/funding-program";
import { fundingProgramsService } from "./funding-programs.service";

/**
 * Cached, server-only twins of the program-registry reads — the `/funding-map`
 * SSR prefetch and the whitelabel program detail page.
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

export async function getFundingProgramByIdCached(
  programId: string
): Promise<FundingProgramResponse | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(programTag(programId));

  return fundingProgramsService.getById(programId);
}
