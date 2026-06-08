import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { RUN_DATE_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

interface Props {
  params: Promise<{ communityId: string; runDate: string }>;
}

// Self-canonical per report run-date. Previously inherited defaultMetadata,
// whose canonical is the homepage "/".
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId, runDate } = await params;
  return communitySubpageMetadata(communityId, `reports/${runDate}`);
}

export default async function Page(props: Props) {
  const { communityId, runDate } = await props.params;

  if (!RUN_DATE_REGEX.test(runDate)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} runDate={runDate} />;
}
