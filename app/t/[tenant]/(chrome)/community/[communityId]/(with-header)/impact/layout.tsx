import type { Metadata } from "next";
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

  // No self-canonical: this route is a client-rendered shell, so it is absent
  // from the sitemap and consolidates onto the community root canonical it
  // inherits from the layout. Give it server-rendered content first, then a
  // canonical and a sitemap entry together.
  return {
    title: `${communityName} Impact & Outcomes | ${PROJECT_NAME}`,
    description: `Measure the impact of grants funded by ${communityName}. Explore project outcomes, performance metrics, and community-driven results on ${PROJECT_NAME}.`,
  };
}

export default function ImpactLayout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col gap-5 sm:px-3 md:px-4 px-6  py-2">
      <ImpactTabNavigator />
      {/* The filter row is rendered by the impact index page rather than here:
          it does not belong on /impact/project-discovery, and asking which of
          the two routes is active meant a `usePathname()` read in a client
          component, which is what kept both of them out of the prerender. */}
      {children}
    </div>
  );
}
