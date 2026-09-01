import { notFound } from "next/navigation";
import { PortfolioReportEditorPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportEditorPage";
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

  return <PortfolioReportEditorPage community={community} reportId={reportId} />;
}
