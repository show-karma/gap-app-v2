import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { ItemListJsonLd } from "@/components/Seo/ItemListJsonLd";
import { DEFAULT_PROGRAMS_LIMIT } from "@/src/features/programs/lib/constants";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";
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

  // JSON-LD ItemList of the programs the default view shows (DEV-596).
  //
  // The default view is "All": the client's URL-seeding effect treats an
  // absent `status` query param as the All tab and clears the store's
  // SSR-time "active" filter on mount, so every fetched program renders for
  // users and JS-executing crawlers alike. The server HTML paints the active
  // subset first and hydration reveals the rest — a pre-existing divergence
  // (the server tablist marks Open selected, the client lands on All) noted
  // on the PR; the schema describes the post-hydration default view.
  const listedPrograms = programs ?? [];

  // On a tenant domain the schema must describe the tenant's own URLs, not the
  // Karma-branded ones these PAGES helpers build.
  const whitelabel = await getWhitelabelContext();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemListJsonLd
        name="Funding opportunities"
        whitelabel={whitelabel}
        items={listedPrograms.map((program) => ({
          name: program.metadata?.title ?? program.name ?? "Untitled program",
          url: PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId),
        }))}
      />
      <FundingOpportunitiesClient />
    </HydrationBoundary>
  );
}
