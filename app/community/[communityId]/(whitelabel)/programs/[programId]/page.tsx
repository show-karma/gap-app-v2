import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { cache } from "react";
import { PROJECT_NAME } from "@/constants/brand";
import { PROGRAM_DETAIL_STALE_TIME } from "@/features/programs/hooks/use-program";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { DEFAULT_DESCRIPTION, SITE_URL, twitterMeta } from "@/utilities/meta";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";
import ProgramDetailClient from "./ProgramDetailClient";

// generateMetadata blocks on the indexer, so give a cold render headroom over
// the platform default (~10s) — the same 504 class this PR hardens the sitemap
// routes against. The fetch is light (one program) and cached, so this is a
// ceiling, not a budget.
export const maxDuration = 30;

type Params = Promise<{
  communityId: string;
  programId: string;
}>;

// Server-side program fetch, shared by generateMetadata and the render-path
// prefetch below (React.cache makes that one indexer round-trip, not two).
// Public endpoint (isAuthorized false) — these pages ship in the
// funding-programs sitemap.
//
// The 404-vs-everything-else split mirrors `useProgram` exactly: a missing
// program resolves to null (the client renders its not-found empty state),
// anything else throws so a transient indexer 5xx is never hydrated into the
// client cache as a false "Program not found".
const getProgramDetails = cache(async (programId: string): Promise<FundingProgram | null> => {
  try {
    // TODO(#1775): add zod schema
    return await api.get<FundingProgram>(
      INDEXER.V2.FUNDING_PROGRAMS.GET(encodeURIComponent(programId)),
      { isAuthorized: false }
    );
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      return null;
    }
    throw err;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId, programId } = await params;
  const { isWhitelabel, config: wlConfig } = await getWhitelabelContext();

  // Self-referential canonical. Without it the page inherits the community
  // layout's canonical (/community/<id>), so Google treats every program as a
  // duplicate of the community root and none of the funding-programs sitemap
  // URLs get indexed as themselves.
  const canonical = isWhitelabel
    ? `/programs/${programId}`
    : `/community/${communityId}/programs/${programId}`;

  // Metadata degrades to generic copy on any fetch failure — the canonical
  // above does not depend on the program body.
  const program = await getProgramDetails(programId).catch(() => null);
  const programName = program?.metadata?.title || program?.name || "Funding Program";
  const description =
    cleanMarkdownForPlainText(
      program?.metadata?.shortDescription || program?.metadata?.description || "",
      160
    ) || DEFAULT_DESCRIPTION;

  const siteUrl = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : SITE_URL;
  const ogImageBase = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : envVars.VERCEL_URL;
  const ogImage = `${ogImageBase}/api/metadata/communities/${communityId}`;

  return {
    title: { absolute: `${programName} | ${PROJECT_NAME}` },
    description,
    alternates: { canonical },
    twitter: {
      card: "summary_large_image",
      title: programName,
      description,
      creator: twitterMeta.creator,
      site: twitterMeta.site,
      images: [{ url: ogImage, alt: programName }],
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}${canonical}`,
      title: programName,
      description,
      images: [{ url: ogImage, alt: programName }],
    },
  };
}

// The program body is prefetched here and handed to the client tree as a
// hydrated React Query cache entry, so the title, status, description and
// sidebar facts are in the initial HTML instead of behind a client fetch —
// crawlers and no-JS readers see the real page, not the loading skeleton.
//
// `prefetchQuery` swallows a rejected fetch and `dehydrate` omits failed
// queries, so an indexer outage degrades to exactly today's behaviour: the
// client fetches and shows the skeleton. `retry: false` keeps a failing
// prefetch from blocking the response on React Query's backoff — the client
// still retries under its own defaults.
export default async function ProgramDetailPage({ params }: { params: Params }) {
  const { programId } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  await queryClient.prefetchQuery({
    queryKey: wlQueryKeys.programs.detail(programId),
    queryFn: () => getProgramDetails(programId),
    staleTime: PROGRAM_DETAIL_STALE_TIME,
    retry: false,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgramDetailClient />
    </HydrationBoundary>
  );
}
