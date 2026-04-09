import type { Metadata } from "next";
import { CommunityImpactFilterRow } from "@/components/Pages/Communities/Impact/FilterRow";
import { ImpactTabNavigator } from "@/components/Pages/Communities/Impact/ImpactTabNavigator";
import { PROJECT_NAME } from "@/constants/brand";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type LayoutProps = {
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
    title: `${communityName} Impact & Outcomes | ${PROJECT_NAME}`,
    description: `Measure the impact of grants funded by ${communityName}. Explore project outcomes, performance metrics, and community-driven results on ${PROJECT_NAME}.`,
  };
}

export default function ImpactLayout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col gap-5 sm:px-3 md:px-4 px-6  py-2">
      <ImpactTabNavigator />
      <CommunityImpactFilterRow />
      {children}
    </div>
  );
}
