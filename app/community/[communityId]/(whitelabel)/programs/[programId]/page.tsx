import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { DEFAULT_DESCRIPTION, SITE_URL, twitterMeta } from "@/utilities/meta";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";
import ProgramDetailClient from "./ProgramDetailClient";

type Params = Promise<{
  communityId: string;
  programId: string;
}>;

// Server-side program fetch for metadata only. The endpoint is public (these
// pages ship in the funding-programs sitemap), cached in the Data Cache so the
// metadata render never blocks on a cold indexer. A failed fetch falls back to
// generic copy — the canonical below does not depend on it.
async function fetchProgram(programId: string): Promise<FundingProgram | null> {
  try {
    const res = await fetch(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/funding-program-configs/${programId}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as FundingProgram;
  } catch {
    return null;
  }
}

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

  const program = await fetchProgram(programId);
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

export default function ProgramDetailPage() {
  return <ProgramDetailClient />;
}
