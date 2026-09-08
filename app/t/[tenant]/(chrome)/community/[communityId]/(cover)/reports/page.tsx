import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicReportListPage } from "@/components/Pages/Community/PortfolioReports/PublicReportListPage";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";

interface Props {
  params: Promise<{ communityId: string }>;
}

// Self-canonical. Previously inherited defaultMetadata, whose canonical is the
// homepage "/", so every community's reports page pointed its canonical at the
// site root instead of itself.
//
// The title/description used to be inherited from the community layout. This
// route now lives in the chrome-free (cover) group, which has no community
// header to inherit from, so it names itself.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const canonicalMetadata = await communitySubpageMetadata(communityId, "reports");
  const community = await getCommunityDetailsCached(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    ...canonicalMetadata,
    title: `Portfolio Reports - ${communityName}`,
    description: `Published portfolio reports for ${communityName} — progress, outcomes, and funding activity across the community's projects.`,
  };
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;
  const community = await getCommunityDetailsCached(communityId);

  if (!community) {
    notFound();
  }

  return <PublicReportListPage community={community} />;
}
