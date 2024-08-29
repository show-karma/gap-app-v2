import CommunityLanding from "@/components/Pages/Communities/CommunityLanding";
import { grantReviewDictionary } from "@/components/Pages/GrantReviews/util";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getMetadata } from "@/utilities/sdk";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
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
  const communityInfo = await getMetadata<ICommunityResponse>(
    "community",
    communityId as Hex
  );
  if (
    communityInfo?.uid === zeroUID ||
    !communityInfo ||
    !grantReviewDictionary[
      communityInfo.details?.data?.slug as keyof typeof grantReviewDictionary
    ]
  ) {
    notFound();
  }
  return {
    title: `Community Grants - ${
      communityInfo.details?.data?.name || communityId
    }`,
    description: `View the list of grants issued by ${
      communityInfo.details?.data?.name || communityId
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
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CommunityLanding community={community} />
    </Suspense>
  );
}
