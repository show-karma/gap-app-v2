import type { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Props = {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ communityId: string }>;
}): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `${communityName} Milestone Updates | ${PROJECT_NAME}`,
    description: `Stay up to date with milestone progress from ${communityName} grantees. Track completed, pending, and overdue milestones across all funded projects on ${PROJECT_NAME}.`,
  };
}

export default function UpdatesLayout({ children }: Props) {
  return children;
}
