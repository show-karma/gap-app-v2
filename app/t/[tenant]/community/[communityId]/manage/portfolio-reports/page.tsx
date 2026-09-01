import { notFound } from "next/navigation";
import { PortfolioReportListPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportListPage";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string }>;
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PortfolioReportListPage community={community} />;
}
