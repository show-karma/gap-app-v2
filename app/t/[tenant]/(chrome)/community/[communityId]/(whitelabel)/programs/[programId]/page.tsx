import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { GrantJsonLd } from "@/components/Seo/GrantJsonLd";
import { PROJECT_NAME } from "@/constants/brand";
import { wlQueryKeys } from "@/src/lib/query-keys";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { programTag } from "@/utilities/cache/tags";
import { chosenCommunities } from "@/utilities/chosenCommunities";
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
// `"use cache"` needs a named declaration; React's `cache()` still wraps it for
// per-request dedup. The rethrow above 404 is deliberate and survives caching:
// a thrown error is not a cached value, so a transient indexer 5xx is retried
// on the next request instead of being frozen in as a false "not found".
async function fetchProgramDetails(programId: string): Promise<FundingProgram | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(programTag(programId));

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
}

const getProgramDetails = cache(fetchProgramDetails);

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

  const program = await getProgramDetails(programId).catch(() => {
    // SUPPRESSED: metadata must still render when the indexer is unavailable.
    // The canonical above does not depend on the program body, so the page
    // degrades to generic copy rather than failing the whole route.
    return null;
  });
  const programName = program?.metadata?.title || program?.name || "Funding Program";
  const description =
    cleanMarkdownForPlainText(
      program?.metadata?.shortDescription || program?.metadata?.description || "",
      160
    ) || DEFAULT_DESCRIPTION;

  const siteUrl = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : SITE_URL;
  const ogImageBase = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : envVars.APP_ORIGIN;
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

// The program body is fetched here and handed to the client tree as a
// hydrated React Query cache entry, so the title, status, description and
// sidebar facts are in the initial HTML instead of behind a client fetch —
// crawlers and no-JS readers see the real page, not the loading skeleton.
//
// An indexer failure hydrates nothing, so the outage degrades to exactly
// today's behaviour: the client fetches and shows the skeleton, then retries
// under its own defaults. A 404 resolves to null and IS hydrated — the client
// renders its not-found state from the cache without refetching.
const PRERENDERED_PROGRAM_SAMPLE = 2;

/**
 * A small sample of real programs, prerendered at build.
 *
 * The build named this page's `await params` directly:
 *
 *   at ProgramDetailPage (.../programs/[programId]/page.tsx:126:38)
 * > 126 |   const { communityId, programId } = await params;
 *
 * Same class as the community and project layouts before they had samples: a
 * top-level params read on a segment with no build-time value. This route is
 * Cache-class, so a Suspense boundary is not available — `generateStaticParams`
 * is the lever, and it is the one that already worked twice.
 *
 * The ids are read from the registry for the sampled communities rather than
 * hard-coded, and degrade to an empty list on failure: a build with no
 * prerendered program pages, never a fabricated id that prerenders a 404.
 */
export async function generateStaticParams(): Promise<
  Array<{ communityId: string; programId: string }>
> {
  const communities = chosenCommunities().slice(0, 1);

  const perCommunity = await Promise.all(
    communities.map(async (community) => {
      try {
        const programs = await api.get<FundingProgram[]>(
          INDEXER.V2.FUNDING_PROGRAMS.BY_COMMUNITY(encodeURIComponent(community.slug)),
          { isAuthorized: false }
        );

        return (programs ?? [])
          .slice(0, PRERENDERED_PROGRAM_SAMPLE)
          .map((program) => ({ communityId: community.slug, programId: program.programId }));
      } catch {
        return [];
      }
    })
  );

  return perCommunity.flat();
}

export default async function ProgramDetailPage({ params }: { params: Params }) {
  const { communityId, programId } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: defaultQueryOptions },
  });

  // One server-side fetch (deduped with generateMetadata by React.cache) feeds
  // both the hydrated React Query entry and the Grant JSON-LD below. The
  // schema only ships when the page body renders the program, and it only
  // carries facts that body states — the title (h1), the description, and the
  // "by <community>" byline as funder.
  const program = await getProgramDetails(programId).catch(
    // SUPPRESSED: a transient indexer failure must degrade to the client fetch
    // path, not fail the whole route; the client surfaces the error state.
    (): undefined => undefined
  );

  if (program !== undefined) {
    queryClient.setQueryData(wlQueryKeys.programs.detail(programId), program);
  }

  const { isWhitelabel, config: wlConfig } = await getWhitelabelContext();
  const siteUrl = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : SITE_URL;
  const canonicalPath = isWhitelabel
    ? `/programs/${programId}`
    : `/community/${communityId}/programs/${programId}`;
  const grantDescription = cleanMarkdownForPlainText(program?.metadata?.description || "", 300);
  // The h1 renders `metadata.title || name`; a program with neither would show
  // an empty heading, so it gets no schema either.
  const grantName = program?.metadata?.title || program?.name || "";

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {program && grantName ? (
        <GrantJsonLd
          name={grantName}
          url={`${siteUrl}${canonicalPath}`}
          description={grantDescription || undefined}
          funderName={program.communitySlug || undefined}
        />
      ) : null}
      <ProgramDetailClient />
    </HydrationBoundary>
  );
}
