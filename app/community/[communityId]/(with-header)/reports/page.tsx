import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getCommunityDetails } from "@/utilities/queries/v2/community";

interface Props {
  params: Promise<{ communityId: string }>;
}

// Self-canonical. Previously inherited defaultMetadata, whose canonical is the
// homepage "/", so every community's reports page pointed its canonical at the
// site root instead of itself.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  return communitySubpageMetadata(communityId, "reports");
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetails(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportListPage community={community} />;
}
