import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { WhitelabelJsonLd } from "@/components/Seo/WhitelabelJsonLd";
import { CommunityAnalyticsGroup } from "@/components/Utilities/CommunityAnalyticsGroup";
import { PROJECT_NAME } from "@/constants/brand";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { envVars } from "@/utilities/enviromentVars";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, twitterMeta } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { FALLBACK_PROGRAM_PAIRS, withPrerenderFallback } from "@/utilities/prerender-samples";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";
import { reportCanonicalMismatchIfAny } from "@/utilities/sentry/reportCanonicalMismatch";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Deduplicate across generateMetadata, generateViewport, and Layout per request
const getCachedContext = cache(getWhitelabelContext);

type Params = Promise<{
  communityId: string;
}>;

const PRERENDERED_COMMUNITY_SAMPLE = 3;

/**
 * A small sample of real communities, prerendered at build.
 *
 * Its presence is the point as much as its contents: with `generateStaticParams`
 * the layout may keep its top-level `await params`, because the sample values
 * are known at build time. Every other community renders on its first request
 * and is then persisted like any other on-demand entry, so this bounds build
 * time without bounding what is servable.
 *
 * The slugs come from `chosenCommunities()` — the same list the homepage and
 * the communities sitemap use, so they are real on both staging and production
 * rather than hand-picked and liable to rot.
 */
export function generateStaticParams(): Array<{ communityId: string }> {
  // `chosenCommunities()` is a checked-in list and cannot be empty today, but
  // the guard is not decoration: under cacheComponents an empty
  // generateStaticParams fails the build at page-data collection, so every
  // sampler states its floor rather than relying on a caller staying non-empty.
  return withPrerenderFallback(
    chosenCommunities()
      .slice(0, PRERENDERED_COMMUNITY_SAMPLE)
      .map((community) => ({ communityId: community.slug })),
    FALLBACK_PROGRAM_PAIRS.slice(0, 1).map(({ communityId }) => ({ communityId }))
  );
}

export async function generateViewport(): Promise<Viewport> {
  const { isWhitelabel, tenantConfig, config } = await getCachedContext();
  if (!isWhitelabel) return {};
  const primary = tenantConfig?.theme?.colors?.primary ?? config?.theme?.primaryColor ?? "#000000";
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: primary },
      { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;
  const { isWhitelabel, config: wlConfig } = await getCachedContext();

  const community = await getCommunityDetailsCached(communityId);

  // Tripwire: a resolved community whose slug differs from the requested id
  // signals the cross-request render bleed (see reportCanonicalMismatchIfAny).
  reportCanonicalMismatchIfAny({
    scope: "community",
    requestedId: communityId,
    resolvedSlug: community?.details?.slug,
    resolvedUid: community?.uid,
  });

  const communityName = community?.details?.name || communityId;

  const dynamicMetadata = {
    title: isWhitelabel
      ? `${communityName} Grants`
      : `${communityName} Community Grants | ${PROJECT_NAME}`,
    description: `Explore grants and funded projects by ${communityName} on ${PROJECT_NAME}. Track grantee milestones, measure impact, and discover funding opportunities in the ecosystem.`,
  };

  if (!community) {
    dynamicMetadata.title = `Launch ${communityName} community!`;
    dynamicMetadata.description = `Looks like no one's started this community. Create it now to launch programs, fund projects, and track progress, all in one place.`;
  }

  const siteUrl = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : SITE_URL;
  const ogImageBase = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : envVars.APP_ORIGIN;
  const canonical = isWhitelabel ? "/" : `/community/${communityId}`;

  const title = dynamicMetadata.title || DEFAULT_TITLE;
  const description = dynamicMetadata.description || DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: twitterMeta.creator,
      site: twitterMeta.site,
      images: [
        {
          url: `${ogImageBase}/api/metadata/communities/${communityId}`,
          alt: title,
        },
      ],
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}${canonical}`,
      title,
      description,
      images: [
        {
          url: `${ogImageBase}/api/metadata/communities/${communityId}`,
          alt: title,
        },
      ],
    },
  };
}

export default async function Layout(props: { children: React.ReactNode; params: Params }) {
  const { communityId } = await props.params;
  const { isWhitelabel, tenantConfig, config } = await getCachedContext();

  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const canonicalUrl = isWhitelabel && config ? `https://${config.domain}` : undefined;

  // Free, but not for the reason a request-cached loader would be: this is the
  // `"use cache"` twin, so the entry is keyed on the segment and shared across
  // requests for its `cacheLife("minutes")` window and invalidated by
  // `communityTag`. `generateMetadata` above reads the same key, so this is a
  // second read of one cache entry rather than a second fetch — and it stays
  // free for the next visitor too, which request scoping never was.
  //
  // Analytics groups on the UID rather than on the URL segment, which may be
  // either a slug or a uid — the same community would otherwise reach Mixpanel
  // as two different groups. The slug comes from the same resolved entity for
  // the same reason: it is the readable label, and reading it off the URL would
  // sometimes yield a uid.
  const community = await getCommunityDetailsCached(communityId);

  return (
    <>
      <CommunityAnalyticsGroup
        uid={community?.uid ?? null}
        slug={community?.details?.slug ?? null}
      />
      {isWhitelabel && tenantConfig && canonicalUrl && (
        <WhitelabelJsonLd tenant={tenantConfig} url={canonicalUrl} />
      )}
      {children}
    </>
  );
}
