import type { Metadata } from "next";
import { cache } from "react";
import { PROJECT_NAME } from "@/constants/brand";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { DEFAULT_DESCRIPTION, SITE_URL, twitterMeta } from "@/utilities/meta";
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

// Server-side program fetch for metadata only. Public endpoint (isAuthorized
// false) — these pages ship in the funding-programs sitemap. Reuses fetchData
// (base-URL resolution + error shaping) and React.cache, matching the sibling
// apply/ route. A failed fetch falls back to generic copy — the canonical
// below does not depend on it.
const getProgramDetails = cache(async (programId: string): Promise<FundingProgram | null> => {
  try {
    const [data] = await fetchData<FundingProgram>(
      `/v2/funding-program-configs/${encodeURIComponent(programId)}`,
      "GET",
      {},
      {},
      {},
      false
    );
    return data;
  } catch {
    return null;
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

  const program = await getProgramDetails(programId);
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
