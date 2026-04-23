import { notFound } from "next/navigation";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

const MONTH_REGEX = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;

interface Props {
  params: Promise<{ communityId: string; month: string }>;
}

export default async function Page(props: Props) {
  const { communityId, month } = await props.params;

  if (!MONTH_REGEX.test(month)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} month={month} />;
}
