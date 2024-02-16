import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGap } from "@/hooks";
import {
  MESSAGES,
  PAGES,
  cn,
  defaultMetadata,
  useSigner,
  zeroUID,
} from "@/utilities";
import { Community } from "@show-karma/karma-gap-sdk";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/Utilities/Spinner";
import { NextSeo } from "next-seo";
import { Stats } from "@/components/Pages/Stats";

export default function Index() {
  return (
    <>
      <NextSeo
        title={defaultMetadata.title}
        description={defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: defaultMetadata.title,
          description: defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: defaultMetadata.title,
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
      <Stats />
    </>
  );
}
