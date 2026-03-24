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
    title: `Donate to ${communityName} Projects | ${PROJECT_NAME}`,
    description: `Support projects in the ${communityName} ecosystem by donating directly to grantees. Browse programs, select projects, and contribute to builders on ${PROJECT_NAME}.`,
  };
}

export default function DonateLayout({ children }: Props) {
  return children;
}
