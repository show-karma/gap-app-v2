import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { PublicControlCenter } from "@/components/Pages/Communities/Financials/PublicControlCenter";
import { getCommunityPayoutsPublic } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import { FINANCIALS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{ communityId: string }>;

const getCachedCommunity = cache(getCommunityDetails);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;

  if (!FINANCIALS_ENABLED_COMMUNITIES.includes(communityId)) {
    return {};
  }

  const community = await getCachedCommunity(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `Financials - ${communityName}`,
    description: `View financial overview, project agreements, milestones, and payment status for ${communityName}.`,
  };
}

interface KycConfigResponse {
  isEnabled: boolean;
  provider: string | null;
}

const DEFAULT_PAGE_OPTIONS = { page: 1, limit: 25 };

async function prefetchFinancialsData(queryClient: QueryClient, communityId: string) {
  await Promise.allSettled([
    // Prefetch initial payouts (page 1, 25 items, no filters)
    // Query key must match useCommunityPayoutsPublic in use-payout-disbursement.ts
    queryClient.prefetchQuery({
      queryKey: ["payoutDisbursement", "communityPayoutsPublic", communityId, DEFAULT_PAGE_OPTIONS],
      queryFn: () => getCommunityPayoutsPublic(communityId, DEFAULT_PAGE_OPTIONS),
      staleTime: 1000 * 60 * 2,
    }),
    // Prefetch KYC config (determines if KYB column shows)
    // Query key must match useKycConfig in useKycStatus.ts
    queryClient.prefetchQuery({
      queryKey: ["kyc", "config", communityId],
      queryFn: async () => {
        const [data, error] = await fetchData<KycConfigResponse>(
          INDEXER.KYC.GET_CONFIG(communityId),
          "GET",
          {},
          {},
          {},
          false
        );
        if (error) {
          const errorLower = error.toLowerCase();
          if (errorLower.includes("not found") || errorLower.includes("not configured")) {
            return null;
          }
          throw new Error(error);
        }
        return data ?? null;
      },
      staleTime: 1000 * 60 * 10,
    }),
  ]);
}

export default async function FinancialsPage({ params }: { params: Params }) {
  const { communityId } = await params;

  if (!FINANCIALS_ENABLED_COMMUNITIES.includes(communityId)) {
    redirect(PAGES.COMMUNITY.ALL_GRANTS(communityId));
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await prefetchFinancialsData(queryClient, communityId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-5 py-6 animate-fade-in-up">
        <PublicControlCenter />
      </div>
    </HydrationBoundary>
  );
}
