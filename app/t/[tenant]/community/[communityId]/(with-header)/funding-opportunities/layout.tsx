import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
};

// The rendered directory lives in a client component, so its metadata lives
// here. Without it the funding directory inherits the community layout's
// canonical and title, which made a sitemap-listed URL point at
// `/community/<id>`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ communityId: string }>;
}): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  // Self-canonical (whitelabel-aware): the page now server-renders the program
  // directory into the initial HTML, so it carries its own crawlable content
  // and ships in the communities sitemap again — canonical, content and
  // sitemap entry moved together (DEV-611).
  const canonicalMetadata = await communitySubpageMetadata(communityId, "funding-opportunities");

  return {
    ...canonicalMetadata,
    title: `${communityName} Funding Opportunities | ${PROJECT_NAME}`,
    description: `Find open, upcoming, and closed grant programs from ${communityName}. Compare funding amounts, deadlines, and eligibility before you apply on ${PROJECT_NAME}.`,
  };
}

export default function FundingOpportunitiesLayout({ children }: LayoutProps) {
  return children;
}
