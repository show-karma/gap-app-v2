import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { cache } from "react";
import { PublicControlCenter } from "@/components/Pages/Communities/Financials/PublicControlCenter";
import { Link } from "@/src/components/navigation/Link";
import { getCommunityPayoutsPublic } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { FINANCIALS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
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
        try {
          // TODO(#1775): add zod schema
          const data = await api.get<KycConfigResponse>(INDEXER.KYC.GET_CONFIG(communityId), {
            isAuthorized: false,
          });
          return data ?? null;
        } catch (e) {
          if (isApiError(e)) {
            const bodyMessage =
              e instanceof HttpError
                ? (e.body as { message?: string } | undefined)?.message
                : undefined;
            const causeMessage = (e.cause as { message?: string } | undefined)?.message;
            const errorLower = (bodyMessage || causeMessage || e.message).toLowerCase();
            if (errorLower.includes("not found") || errorLower.includes("not configured")) {
              return null;
            }
          }
          throw e;
        }
      },
      staleTime: 1000 * 60 * 10,
    }),
  ]);
}

export default async function FinancialsPage({ params }: { params: Params }) {
  const { communityId } = await params;

  // Financials is a per-community feature flag. For a community that exists but
  // hasn't enabled it, render an explicit "not available" state with a way back
  // — clear feedback, rather than a silent redirect (looks broken) or a generic
  // "community not found" (misleading — the community exists).
  if (!FINANCIALS_ENABLED_COMMUNITIES.includes(communityId)) {
    const community = await getCachedCommunity(communityId);
    const communityName = community?.details?.name || communityId;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-bold">Financials not available</h1>
        <p className="max-w-md text-muted-foreground">
          The financials dashboard isn&apos;t enabled for {communityName}.
        </p>
        <Link
          href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to grants
        </Link>
      </div>
    );
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
