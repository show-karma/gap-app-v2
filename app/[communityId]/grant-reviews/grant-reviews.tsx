import CommunityLanding from "@/components/Pages/Communities/CommunityLanding";
import { zeroUID } from "@/utilities/commons";
import { getMetadata } from "@/utilities/sdk";
import type { ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { notFound } from "next/navigation";
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
  if (communityInfo?.uid === zeroUID || !communityInfo) {
    notFound();
  }
  return {
    title: `Community Grants - ${communityInfo.name || communityId}`,
    description: `View the list of grants issued by ${
      communityInfo.name || communityId
    } and the grantee updates.`,
  };
}

export default function Page() {
  return <CommunityLanding />;
}
