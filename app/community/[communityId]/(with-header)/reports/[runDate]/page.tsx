import { notFound } from "next/navigation";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { defaultMetadata } from "@/utilities/meta";
import { RUN_DATE_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string; runDate: string }>;
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
