import { notFound } from "next/navigation";
import { PortfolioReportPreviewPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportPreviewPage";
import { defaultMetadata } from "@/utilities/meta";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

export const metadata = defaultMetadata;

interface Props {
  params: Promise<{ communityId: string; reportId: string }>;
}

export default async function Page(props: Props) {
  const { communityId, reportId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PortfolioReportPreviewPage community={community} reportId={reportId} />;
}
