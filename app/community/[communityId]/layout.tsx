import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { communityColors } from "@/utilities/communityColors";
import { envVars } from "@/utilities/enviromentVars";
import { defaultMetadata } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetailsV2 } from "@/utilities/queries/getCommunityDataV2";
import { Metadata } from "next";
import { CommunityImpactStatCards } from "@/components/Pages/Communities/Impact/StatCards";
import CommunityHeader from "@/components/Community/Header";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";

type Params = Promise<{
  communityId: string;
}>;
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { communityId } = await params;

  const community = await getCommunityDetailsV2(communityId);
  const communityName = community?.details?.name || communityId;

  const dynamicMetadata = {
    title: `Karma GAP - ${communityName} community grants`,
    description: `View the list of grants issued by ${communityName} and the grantee updates.`,
  };

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

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { communityId } = await props.params;

  const { children } = props;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const community = await getCommunityDetailsV2(communityId);

  if (!community) {
    return <CommunityNotFound communityId={communityId} />;
  }

  return (
    <div className="flex w-full h-full max-w-full flex-col justify-start max-lg:flex-col">
      <CommunityHeader community={community} />
      {children}
    </div>
  );
}
