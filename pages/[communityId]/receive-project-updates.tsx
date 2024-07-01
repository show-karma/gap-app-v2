import { ReceiveProjectUpdates } from "@/components/Pages/ReceiveProjectUpdates";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { getMetadata } from "@/utilities/sdk";
import type { ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { NextSeo } from "next-seo";
import { Hex } from "viem";

export const communitiesToBulkSubscribe = ["gitcoin"];

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const communityId = params?.communityId as string;
  const communityInfo = await getMetadata<ICommunityDetails>(
    "communities",
    communityId as Hex
  );
  if (
    communityInfo?.uid === zeroUID ||
    !communityInfo ||
    !communitiesToBulkSubscribe.includes(communityInfo.slug as string)
  ) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      communityId,
      communityName: communityInfo.name || "",
    },
  };
}
function BulkProjectsPage({
  communityName,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dynamicMetadata = {
    title: `Karma GAP - Receive project updates for ${communityName}`,
    description: `Receive all the updates for the projects funded by your wallet.`,
  };

  return (
    <>
      <NextSeo
        title={dynamicMetadata.title || defaultMetadata.title}
        description={dynamicMetadata.description || defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: dynamicMetadata.title || defaultMetadata.title,
          description:
            dynamicMetadata.description || defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: dynamicMetadata.title || defaultMetadata.title,
          })),
          // site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/images/favicon.png",
          },
        ]}
      />
      <div className="mb-8 flex flex-col items-center px-12 py-8  max-xl:px-12 max-md:px-4">
        <ReceiveProjectUpdates communityName={communityName} />
      </div>
    </>
  );
}

export default BulkProjectsPage;
