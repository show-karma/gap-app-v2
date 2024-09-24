/* eslint-disable @next/next/no-img-element */
import React from "react";
import type { Metadata } from "next";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { CommunityGrants } from "@/components/CommunityGrants";
import { CommunityFeed } from "@/components/CommunityFeed";
import { communityColors } from "@/utilities/communityColors";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import type { SortByOptions, StatusOptions } from "@/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { notFound } from "next/navigation";
import { ReceiveProjectUpdates } from "@/components/Pages/ReceiveProjectUpdates";
import { communitiesToBulkSubscribe } from "@/utilities/subscribe";
import { envVars } from "@/utilities/enviromentVars";
import { CommunitiesLoading } from "@/components/Pages/Communities/Loading";

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
  } catch {
    console.log("Not found community", communityId);
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

export default async function Page({ params }: Props) {
  const { communityId } = params;
  let community: ICommunityResponse | null = null;
  let categoriesOptions: string[] = [];

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
      async () => {
        const [data] = await fetchData(
          INDEXER.COMMUNITY.CATEGORIES(communityId as string)
        );
        if (data?.length) {
          const categoriesToOrder = data.map(
            (category: { name: string }) => category.name
          );
          categoriesOptions = categoriesToOrder.sort((a: string, b: string) => {
            return a.localeCompare(b, "en");
          });
        }
      },
    ].map((func) => func())
  );

  if (!community) {
    notFound();
  }

  const defaultSortBy = "milestones" as SortByOptions;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedStatus = "all" as StatusOptions;

  return (
    <div className="flex w-full max-w-full flex-row justify-start gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4  max-lg:flex-col">
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
        <div
          className="flex h-max w-full flex-row items-center justify-start gap-3 rounded-2xl p-6 max-lg:py-4"
          style={{
            backgroundColor:
              communityColors[
                (community as ICommunityResponse).uid.toLowerCase() || "black"
              ] || "#000000",
          }}
        >
          <div className="flex justify-center border border-white rounded-full p-2">
            <img
              alt={
                (community as ICommunityResponse).details?.data.name ||
                "Community name"
              }
              src={
                (community as ICommunityResponse)?.details?.data?.imageURL || ""
              }
              className={"h-14 w-14 rounded-full max-lg:h-8 max-lg:w-8"}
            />
          </div>

          <p className="text-3xl font-semibold text-white max-2xl:text-2xl max-lg:text-xl">
            <span className={"font-body"}>
              {community
                ? (community as ICommunityResponse).details?.data?.name
                : ""}
            </span>{" "}
            Community Grants
          </p>
        </div>

        <div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          <CommunityGrants
            categoriesOptions={categoriesOptions}
            defaultSelectedCategories={defaultSelectedCategories}
            defaultSortBy={defaultSortBy}
            defaultSelectedStatus={defaultSelectedStatus}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 w-4/12 max-lg:w-full max-lg:hidden">
        {communitiesToBulkSubscribe.includes(
          (community as ICommunityResponse).details?.data?.slug as string
        ) ? (
          <ReceiveProjectUpdates
            communityName={
              (community as ICommunityResponse).details?.data?.name || ""
            }
          />
        ) : null}

        <CommunityFeed />
      </div>
    </div>
  );
}
