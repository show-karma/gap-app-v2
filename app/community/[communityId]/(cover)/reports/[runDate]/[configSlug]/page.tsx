import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { CONFIG_SLUG_REGEX, RUN_DATE_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

interface Props {
  params: Promise<{ communityId: string; runDate: string; configSlug: string }>;
}

// Self-canonical per (run-date, config): a community running two configs on the
// same day has two distinct reports, and each needs its own canonical URL.
// Mirrors the page's validation so an invalid segment never emits a canonical
// for a URL the page 404s.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId, runDate, configSlug } = await params;
  if (!RUN_DATE_REGEX.test(runDate) || !CONFIG_SLUG_REGEX.test(configSlug)) {
    return {};
  }
  return communitySubpageMetadata(communityId, `reports/${runDate}/${configSlug}`);
}

export default async function Page(props: Props) {
  const { communityId, runDate, configSlug } = await props.params;

  if (!RUN_DATE_REGEX.test(runDate) || !CONFIG_SLUG_REGEX.test(configSlug)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} runDate={runDate} configSlug={configSlug} />;
}
