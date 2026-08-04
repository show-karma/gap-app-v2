import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { ItemListJsonLd } from "@/components/Seo/ItemListJsonLd";
import { DEFAULT_PROGRAMS_LIMIT } from "@/src/features/programs/lib/constants";
import { matchesStatus } from "@/src/features/programs/lib/program-status";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
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

// The program directory is fetched here and handed to the client tree as a
// hydrated React Query cache entry, so each opportunity's title, status,
// deadline and funding facts are in the initial HTML instead of behind a
// client fetch — crawlers and no-JS readers see the real directory, not the
// loading skeleton.
export default async function FundingOpportunitiesPage({ params }: { params: Params }) {
  const { communityId } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  // One server-side fetch feeds both the hydrated React Query entry and the
  // JSON-LD ItemList below. A failed fetch hydrates nothing and ships no
  // schema — exactly the previous degradation: the client fetches and shows
  // the skeleton.
  const programs = await getCommunityPrograms(communityId).catch(
    // SUPPRESSED: an indexer outage here must degrade to the client fetch
    // path, not fail the whole route; the client surfaces the error state.
    (): FundingProgram[] | null => null
  );

  if (programs) {
    queryClient.setQueryData(wlQueryKeys.programs.communityList(communityId), {
      programs,
      // The server has no filter store; hydrate with the same default limit
      // the client hook computes when no limit filter is set.
      limit: DEFAULT_PROGRAMS_LIMIT,
    });
  }

  // JSON-LD ItemList of the programs the default view server-renders (DEV-596).
  // The default filter is "active" (the store's initial state), so only
  // programs the default HTML actually lists are described — closed or
  // upcoming rounds live behind hydrated tabs and stay out.
  const listedPrograms = (programs ?? []).filter((program) => matchesStatus(program, "active"));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemListJsonLd
        name="Funding opportunities"
        items={listedPrograms.map((program) => ({
          name: program.metadata?.title ?? program.name ?? "Untitled program",
          url: PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId),
        }))}
      />
      <FundingOpportunitiesClient />
    </HydrationBoundary>
  );
}
