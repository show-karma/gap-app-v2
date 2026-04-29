import { notFound } from "next/navigation";
import { PublicReportViewPage } from "@/components/Pages/Community/PortfolioReports/PublicReportViewPage";
import { defaultMetadata } from "@/utilities/meta";
import { PERIOD_ID_REGEX } from "@/utilities/portfolio-reports/period";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string; month: string }>;
}

export default async function Page(props: Props) {
  const { communityId, month } = await props.params;

  // The route is named [month] for backward compatibility; the segment now
  // accepts both YYYY-MM and YYYY-MM-Hx (biweekly H1/H2) identifiers.
  if (!PERIOD_ID_REGEX.test(month)) {
    notFound();
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportViewPage community={community} month={month} />;
}
