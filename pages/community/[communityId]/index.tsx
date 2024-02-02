import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGap } from "@/hooks";
import {
  PAGES,
  cn,
  defaultMetadata,
  ogMeta,
  twitterMeta,
  zeroUID,
} from "@/utilities";
import { Community, ICommunityDetails } from "@show-karma/karma-gap-sdk";
import { CommunityFeed, CommunityGrants } from "@/components";
import { getMetadata } from "@/utilities/sdk/getMetadata";
import { Metadata } from "next";
import { Hex } from "viem";
import { notFound } from "next/navigation";
import Head from "next/head";
import { NextSeo } from "next-seo";

type Props = {
  params: {
    communityID: string;
  };
};

// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   const { communityID } = params;
//   let name: string | undefined;
//   try {
//     const communityInfo = await getMetadata<ICommunityDetails>(
//       "communities",
//       communityID as Hex
//     );
//     name = communityInfo?.name;
//     // const imageURL = communityInfo?.details?.imageURL;
//     if (communityInfo?.uid === zeroUID || !communityInfo) {
//       notFound();
//     }
//   } catch (e) {
//     console.log(e);
//   }

//   return {
//     ...defaultMetadata,
//     title: `Karma GAP - ${name || communityID} community grants`,
//     description: `View the list of grants issued by ${
//       name || communityID
//     } and the grantee updates.`,
//     openGraph: {
//       ...ogMeta,
//       title: `Karma GAP - ${name || communityID} community grants`,
//       description: `View the list of grants issued by ${
//         name || communityID
//       } and the grantee updates.`,
//       // images: [imageURL || ''],
//     },
//     twitter: {
//       ...twitterMeta,
//       title: `Karma GAP - ${
//         name || communityID || communityID
//       } community grants`,
//       description: `View the list of grants issued by ${
//         name || communityID
//       } and the grantee updates.`,
//     },
//   };
// }

export default function Index() {
  const router = useRouter();
  const communityId = router.query.communityId as string;
  const { gap } = useGap();

  // Call API
  const [loading, setLoading] = useState<boolean>(true); // Loading state of the API call
  const [community, setCommunity] = useState<Community | undefined>(undefined); // Data returned from the API

  useEffect(() => {
    const fetchDetails = async () => {
      if (!communityId || !gap) return;
      setLoading(true);
      try {
        const result = await (communityId.startsWith("0x")
          ? gap.fetch.communityById(communityId as `0x${string}`)
          : gap.fetch.communityBySlug(communityId));
        if (!result || result.uid === zeroUID)
          throw new Error("Community not found");
        setCommunity(result);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        if (
          error.message === "Community not found" ||
          error.message.includes("422")
        ) {
          router.push(PAGES.NOT_FOUND);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [communityId, gap]);

  const dynamicMetadata = {
    title: `Karma GAP - ${community?.details?.name} community grants`,
    description: `View the list of grants issued by ${
      community?.details?.name || community?.uid
    } and the grantee updates.`,
  };

  return (
    <>
      <NextSeo
        title={dynamicMetadata.title || defaultMetadata.title}
        description={defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: dynamicMetadata.title || defaultMetadata.title,
          description: defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: dynamicMetadata.title || defaultMetadata.title,
          })),
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/favicon.png",
          },
        ]}
      />
      <div className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="py-8 rounded-xl bg-black border border-primary-800 text-center flex flex-col gap-2 justify-center w-full items-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={community?.details?.imageURL}
              className={cn(
                "h-14 w-14 rounded-full",
                loading ? "animate-pulse bg-gray-600" : ""
              )}
            />
          </div>

          <div className="mt-3 text-3xl font-black text-white w-max flex flex-row gap-2">
            <span
              className={cn(
                loading
                  ? "animate-pulse min-w-32 bg-gray-600 rounded-lg px-4 py-0"
                  : ""
              )}
            >
              {community ? community.details?.name : ""}
            </span>{" "}
            Community Grants
          </div>
        </div>

        <div className="mt-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          <CommunityGrants />
          <CommunityFeed />
        </div>
      </div>
    </>
  );
}
