import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { WhitelabelJsonLd } from "@/components/Seo/WhitelabelJsonLd";
import { PROJECT_NAME } from "@/constants/brand";
import { envVars } from "@/utilities/enviromentVars";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, twitterMeta } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Deduplicate across generateMetadata, generateViewport, and Layout per request
const getCachedContext = cache(getWhitelabelContext);

type Params = Promise<{
  communityId: string;
}>;

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

  const community = await getCommunityDetails(communityId);
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
  const ogImageBase = isWhitelabel && wlConfig ? `https://${wlConfig.domain}` : envVars.VERCEL_URL;
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

  return (
    <>
      {isWhitelabel && tenantConfig && canonicalUrl && (
        <WhitelabelJsonLd tenant={tenantConfig} url={canonicalUrl} />
      )}
      {children}
    </>
  );
}
