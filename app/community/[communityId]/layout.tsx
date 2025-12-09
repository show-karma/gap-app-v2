import type { Metadata } from "next";
import CommunityHeader from "@/components/Community/Header";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";
import { PROJECT_NAME } from "@/constants/brand";
import { layoutTheme } from "@/src/helper/theme";
import { envVars } from "@/utilities/enviromentVars";
import { defaultMetadata } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/community";
import { cn } from "@/utilities/tailwind";

type Params = Promise<{
  communityId: string;
}>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;

  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  const dynamicMetadata = {
    title: `${PROJECT_NAME} - ${communityName} community grants`,
    description: `View the list of grants issued by ${communityName} and the grantee updates.`,
  };

  if (!community) {
    dynamicMetadata.title = `Launch ${communityName} community!`;
    dynamicMetadata.description = `Looks like no one's started this community. Create it now to launch programs, fund projects, and track progress, all in one place.`;
  }

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
  };
}

export default async function Layout(props: { children: React.ReactNode; params: Params }) {
  const { communityId } = await props.params;

  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetails(communityId);

  if (!community) {
    return <CommunityNotFound communityId={communityId} />;
  }

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">
      <CommunityHeader community={community} />
      <div className={cn(layoutTheme.padding, "w-full max-w-full")}>{children}</div>
    </div>
  );
}
