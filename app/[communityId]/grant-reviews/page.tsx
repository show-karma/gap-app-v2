import CommunityLanding from "@/components/Pages/Communities/CommunityLanding";
import { grantReviewDictionary } from "@/components/Pages/GrantReviews/util";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getMetadata } from "@/utilities/sdk";
import type { ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Hex } from "viem";

type Props = {
  params: {
    communityId: string;
  };
};

export async function generateMetadata({ params }: Props) {
  const communityId = params.communityId;
  const communityInfo = await getMetadata<ICommunityDetails>(
    "communities",
    communityId as Hex
  );
  if (
    communityInfo?.uid === zeroUID ||
    !communityInfo ||
    !grantReviewDictionary[
      communityInfo.slug as keyof typeof grantReviewDictionary
    ]
  ) {
    notFound();
  }
  return {
    title: `Community Grants - ${communityInfo.name || communityId}`,
    description: `View the list of grants issued by ${
      communityInfo.name || communityId
    } and the grantee updates.`,
  };
}

export default async function Page({ params }: Props) {
  const communityId = params.communityId;
  const { data } = await gapIndexerApi.communityBySlug(communityId);
  const community = data;

  if (!community || community?.uid === zeroUID) {
    notFound();
  }

  return (
    <Suspense fallback={<Spinner />}>
      <CommunityLanding community={community} />
    </Suspense>
  );
}
