import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import {
  DEFAULT_PROGRAMS_LIMIT,
  PROGRAMS_LIST_STALE_TIME,
} from "@/src/features/programs/hooks/use-programs";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import FundingOpportunitiesClient from "./FundingOpportunitiesClient";

type Params = Promise<{ communityId: string }>;

// Server-side programs fetch, memoized with React.cache so any other reader in
// the same request (metadata, layout) shares one indexer round-trip. Public
// endpoint (isAuthorized false) — this page ships in the communities sitemap.
const getCommunityPrograms = cache(async (communityId: string): Promise<FundingProgram[]> => {
  // TODO(#1775): add zod schema
  const programs = await api.get<FundingProgram[]>(
    INDEXER.V2.FUNDING_PROGRAMS.BY_COMMUNITY(encodeURIComponent(communityId)),
    { isAuthorized: false }
  );
  return programs ?? [];
});

// The program directory is prefetched here and handed to the client tree as a
// hydrated React Query cache entry, so each opportunity's title, status,
// deadline and funding facts are in the initial HTML instead of behind a
// client fetch — crawlers and no-JS readers see the real directory, not the
// loading skeleton.
//
// `prefetchQuery` swallows a rejected fetch and `dehydrate` omits failed
// queries, so an indexer outage degrades to exactly the previous behaviour:
// the client fetches and shows the skeleton. `retry: false` keeps a failing
// prefetch from blocking the response on React Query's backoff — the client
// still retries under its own defaults.
export default async function FundingOpportunitiesPage({ params }: { params: Params }) {
  const { communityId } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await queryClient.prefetchQuery({
    queryKey: wlQueryKeys.programs.communityList(communityId),
    queryFn: async () => ({
      programs: await getCommunityPrograms(communityId),
      // The server has no filter store; hydrate with the same default limit
      // the client hook computes when no limit filter is set.
      limit: DEFAULT_PROGRAMS_LIMIT,
    }),
    staleTime: PROGRAMS_LIST_STALE_TIME,
    retry: false,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FundingOpportunitiesClient />
    </HydrationBoundary>
  );
}
