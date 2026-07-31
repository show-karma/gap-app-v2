import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
};

// The page itself is a client component, so its metadata lives here. Without it
// the funding directory inherits the community layout's canonical and title,
// which made a sitemap-listed URL point at `/community/<id>`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ communityId: string }>;
}): Promise<Metadata> {
  const { communityId } = await params;
  const [community, canonicalMetadata] = await Promise.all([
    getCommunityDetails(communityId),
    communitySubpageMetadata(communityId, "funding-opportunities"),
  ]);
  const communityName = community?.details?.name || communityId;

  return {
    ...canonicalMetadata,
    title: `${communityName} Funding Opportunities | ${PROJECT_NAME}`,
    description: `Find open, upcoming, and closed grant programs from ${communityName}. Compare funding amounts, deadlines, and eligibility before you apply on ${PROJECT_NAME}.`,
  };
}

export default function FundingOpportunitiesLayout({ children }: LayoutProps) {
  return children;
}
