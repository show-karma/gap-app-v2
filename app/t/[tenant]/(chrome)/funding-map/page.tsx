import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import { FundingMapList } from "@/src/features/funding-map/components/funding-map-list";
import { FundingMapSearch } from "@/src/features/funding-map/components/funding-map-search";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";
import {
  DEFAULT_FUNDING_MAP_API_PARAMS,
  fundingProgramsKeys,
} from "@/src/features/funding-map/constants/query-keys";
import { getAllFundingProgramsCached } from "@/src/features/funding-map/services/funding-programs.cached";
import { customMetadata } from "@/utilities/meta";

const PAGE_DESCRIPTION =
  "Browse the live directory of funding programs from communities and organizations on Karma: grants, retroactive funding, hackathons, bounties, and accelerators. See what each program funds, check deadlines, and apply.";

export const metadata: Metadata = customMetadata({
  title: "Funding Map — Browse Open Grants, Hackathons & Accelerators",
  description: PAGE_DESCRIPTION,
  path: "/funding-map",
});

/**
 * Prefetches the default (unfiltered, page 1, Active) program list so the
 * initial card grid — including its `/community/[slug]/programs/[id]`
 * anchors — is server-rendered and hydrated instead of client-fetched.
 * `prefetchQuery` swallows errors by design: on upstream failure the page
 * renders exactly as before (skeletons, then client fetch with its own
 * error state).
 */
async function prefetchDefaultPrograms(): Promise<QueryClient> {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: fundingProgramsKeys.list(DEFAULT_FUNDING_MAP_API_PARAMS),
    queryFn: () => getAllFundingProgramsCached(DEFAULT_FUNDING_MAP_API_PARAMS),
    staleTime: 5 * 60 * 1000,
  });
  return queryClient;
}

const FundingMapPage = async () => {
  const queryClient = await prefetchDefaultPrograms();

  return (
    <main className="flex w-full flex-col">
      <CollectionPageJsonLd
        name="Funding Map — Browse Open Grants, Hackathons & Accelerators"
        description={PAGE_DESCRIPTION}
        url="/funding-map"
      />
      {/* No Suspense boundaries here (DEV-612): this route is
          sitemap-crawlable and renders dynamically, so a boundary made the
          search block and the prefetched program cards stream as hidden late
          chunks that no-JS readers never see. The heading and the hydrated
          card grid all land in the initially visible HTML. */}
      <section className="flex w-full justify-center my-16">
        <div className="flex w-full max-w-xl flex-col gap-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-center text-3xl font-semibold tracking-tight lg:text-4xl">
              Find funding opportunities
            </h1>
            <FundingMapSearch />
          </div>
        </div>
      </section>
      <div className="flex w-full flex-col gap-6 px-6 py-8 lg:flex-row lg:px-8">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <FundingMapList />
        </HydrationBoundary>
        <FundingMapSidebar />
      </div>
    </main>
  );
};

export default FundingMapPage;
