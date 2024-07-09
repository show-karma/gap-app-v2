import { ReceiveProjectUpdates } from "@/components/Pages/ReceiveProjectUpdates";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { getMetadata } from "@/utilities/sdk";
import type { ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const communitiesToBulkSubscribe = ["gitcoin"];

type Props = {
  params: {
    communityId: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const communityId = params.communityId;
  const communityInfo = await getMetadata<ICommunityDetails>(
    "communities",
    communityId as Hex
  );
  if (
    communityInfo?.uid === zeroUID ||
    !communityInfo ||
    !communitiesToBulkSubscribe.includes(communityInfo.slug as string)
  ) {
    notFound();
  }
  const dynamicMetadata = {
    title: `Karma GAP - Receive email updates from your funded projects.`,
    description: `Receive monthly updates from projects you've funded on ${
      communityInfo.name || communityId
    }.`,
  };

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: dynamicMetadata.title || defaultMetadata.title,
      })),
    },
  };
}

export default async function Page({ params }: Props) {
  const { communityId } = params;
  const communityInfo = await getMetadata<ICommunityDetails>(
    "communities",
    communityId as Hex
  );

  return (
    <div className="mb-8 flex flex-col items-center px-12 py-8  max-xl:px-12 max-md:px-4">
      <ReceiveProjectUpdates communityName={communityInfo?.name || ""} />
    </div>
  );
}
