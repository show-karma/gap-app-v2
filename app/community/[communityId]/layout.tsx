import type { Metadata } from "next";
import { CommunityContentWrapper } from "@/components/Community/CommunityContentWrapper";
import CommunityHeader from "@/components/Community/Header";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";
import { PROJECT_NAME } from "@/constants/brand";
import { envVars } from "@/utilities/enviromentVars";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, twitterMeta } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityDetails } from "@/utilities/queries/v2/getCommunityData";

type Params = Promise<{
  communityId: string;
}>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { communityId } = await params;

  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  const dynamicMetadata = {
    title: `${communityName} Community Grants | ${PROJECT_NAME}`,
    description: `Explore grants and funded projects by ${communityName} on ${PROJECT_NAME}. Track grantee milestones, measure impact, and discover funding opportunities in the ecosystem.`,
  };

  if (!community) {
    dynamicMetadata.title = `Launch ${communityName} community!`;
    dynamicMetadata.description = `Looks like no one's started this community. Create it now to launch programs, fund projects, and track progress, all in one place.`;
  }

  const title = dynamicMetadata.title || DEFAULT_TITLE;
  const description = dynamicMetadata.description || DEFAULT_DESCRIPTION;
  const ogImageUrl = `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/community/${communityId}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: twitterMeta.creator,
      site: twitterMeta.site,
      images: [
        {
          url: ogImageUrl,
          alt: title,
        },
      ],
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/community/${communityId}`,
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: title,
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
      <CommunityContentWrapper>{children}</CommunityContentWrapper>
    </div>
  );
}
