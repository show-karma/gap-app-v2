import { CommunityPageNavigator } from "@/components/Pages/Communities/CommunityPageNavigator";
import { zeroUID } from "@/utilities/commons";
import { communityColors } from "@/utilities/communityColors";
import { envVars } from "@/utilities/enviromentVars";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { defaultMetadata } from "@/utilities/meta";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityImpactStatCards } from "@/components/Pages/Communities/Impact/StatCards";

type Props = {
  params: {
    communityId: string;
  };
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const communityId = params.communityId;
  let communityName = communityId;

  try {
    const { data } = await gapIndexerApi.communityBySlug(communityId);
    communityName = data?.details?.data?.name || communityId;
    if (!data || data?.uid === zeroUID || !data?.details?.data?.name) {
      notFound();
    }
  } catch {
    notFound();
  }

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
    // link: [
    //   {
    //     rel: "icon",
    //     href: "/favicon.ico",
    //   },
    // ],
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { communityId: string };
}) {
  const { communityId } = params;
  let community: ICommunityResponse | null = null;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  await Promise.all(
    [
      async () => {
        try {
          const { data } = await gapIndexerApi.communityBySlug(communityId);
          community = data as ICommunityResponse;
        } catch {
          console.log("Not found community", communityId);
          community = null;
        }
      },
    ].map((func) => func())
  );

  if (!community) {
    notFound();
  }

  return (
    <div className="flex w-full max-w-full flex-col justify-start max-lg:flex-col">
      <div className="flex flex-col gap-4 justify-between items-start mt-4 sm:px-3 md:px-4 px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-row gap-4 flex-wrap max-lg:flex-col justify-between items-center w-full">
          <div className="flex h-max flex-1 flex-row items-center justify-start gap-3 ">
            <div
              className="p-3 rounded-xl"
              style={{
                backgroundColor:
                  communityColors[
                    (community as ICommunityResponse)?.uid?.toLowerCase() ||
                      "black"
                  ] || "#000000",
              }}
            >
              <div className="flex justify-center border border-white rounded-full p-2">
                <img
                  alt={
                    (community as ICommunityResponse)?.details?.data.name ||
                    "Community name"
                  }
                  src={
                    (community as ICommunityResponse)?.details?.data
                      ?.imageURL || ""
                  }
                  className={
                    "h-14 w-14 min-w-14 min-h-14 rounded-full max-lg:h-8 max-lg:w-8 max-lg:min-h-8 max-lg:min-w-8"
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <p className="text-3xl font-body font-semibold text-black dark:text-white max-2xl:text-2xl max-lg:text-xl">
                {community
                  ? (community as ICommunityResponse)?.details?.data?.name
                  : ""}
              </p>
            </div>
          </div>
          <CommunityImpactStatCards />
        </div>
        <CommunityPageNavigator />
      </div>
      <div>{children}</div>
    </div>
  );
}
