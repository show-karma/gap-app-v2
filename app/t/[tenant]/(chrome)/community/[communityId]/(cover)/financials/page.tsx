import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicControlCenter } from "@/components/Pages/Communities/Financials/PublicControlCenter";
import { PageHero } from "@/components/Pages/Communities/PageHero";
import { Link } from "@/src/components/navigation/Link";
import { getCommunityPayoutsPublic } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";
import { FINANCIALS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { COMMITMENTS_AND_DISBURSEMENTS } from "@/utilities/community-nav";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";
import Loading from "./loading";

type Params = Promise<{ communityId: string }>;

// `cache(getCommunityDetails)` used to stand here. React `cache()` dedupes
// within one render; it does not survive it, so the read was still uncached
// I/O during the prerender. The shared "use cache" twin does both jobs -- one
// entry per slug, reused across the metadata and body reads below.

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;

  if (!FINANCIALS_ENABLED_COMMUNITIES.includes(communityId)) {
    return {};
  }

  const community = await getCommunityDetailsCached(communityId);
  const communityName = community?.details?.name || communityId;

  // No self-canonical: this route is a client-rendered shell, so it is absent
  // from the sitemap and consolidates onto the community root canonical it
  // inherits from the layout. Give it server-rendered content first, then a
  // canonical and a sitemap entry together.
  return {
    title: `${COMMITMENTS_AND_DISBURSEMENTS} - ${communityName}`,
    description: `View committed funding, project agreements, milestones, and disbursement status for ${communityName}.`,
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

  // Commitments & Disbursements is a per-community feature flag. For a
  // community that exists but hasn't enabled it, render an explicit "not
  // available" state with a way back — clear feedback, rather than a silent
  // redirect (looks broken) or a generic "community not found" (misleading —
  // the community exists). This page is chrome-free (the (cover) group renders
  // no community navigator), so the copy names the community itself and the
  // link back to the community explorer is the only way out.
  if (!FINANCIALS_ENABLED_COMMUNITIES.includes(communityId)) {
    const community = await getCommunityDetailsCached(communityId);
    const communityName = community?.details?.name || communityId;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-bold">{COMMITMENTS_AND_DISBURSEMENTS} not available</h1>
        <p className="max-w-md text-muted-foreground">
          {communityName} hasn&apos;t enabled the {COMMITMENTS_AND_DISBURSEMENTS} dashboard.
        </p>
        <Link
          href={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to {communityName}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-6 animate-fade-in-up">
      <div className="px-4">
        <PageHero
          compact
          eyebrow="Treasury"
          title={COMMITMENTS_AND_DISBURSEMENTS}
          description="Overview of grants, agreements, milestones, and disbursements made through programs in this community."
        />
      </div>
      <Suspense fallback={<Loading />}>
        <FinancialsWithSeededCache communityId={communityId} />
      </Suspense>
    </div>
  );
}

/**
 * Everything that needs data sits behind the boundary; the heading above does
 * not.
 *
 * Two things in here are runtime reads outside a boundary if they stay in the
 * page body, and either one alone stops the route prerendering:
 * `prefetchFinancialsData` (the payouts list and the KYC config, uncached
 * `api.*` calls), and `PublicControlCenter` itself, which reads
 * `useSearchParams()` for its filter state.
 *
 * Caching the seed was considered and rejected: payouts and KYC are
 * per-community operational data, not the shared crawlable payload the cached
 * loaders serve, and a cached response has to belong to no one
 * (`publicReadOptions`). So the seed streams instead. This route is Stream-class
 * -- absent from the sitemap, no self-canonical (see generateMetadata) -- so
 * DEV-612 does not reach it, and the fallback is the route's own `loading.tsx`.
 *
 * The <h1> stays in the shell because the hero moved up here out of
 * `PublicControlCenter`; the four counts it used to carry went with the data,
 * into the KpiStrip that component now renders. The (cover) group asserts
 * exactly one <h1> per page and it is still this one.
 */
async function FinancialsWithSeededCache({ communityId }: { communityId: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await prefetchFinancialsData(queryClient, communityId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PublicControlCenter />
    </HydrationBoundary>
  );
}
