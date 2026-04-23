import { notFound } from "next/navigation";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
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

  return <PublicReportListPage community={community} />;
}
