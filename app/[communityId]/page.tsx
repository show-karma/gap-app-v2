import React from "react";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { NextSeo } from "next-seo";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { CommunityGrants } from "@/components/CommunityGrants";
import { CommunityFeed } from "@/components/CommunityFeed";
import { communityColors } from "@/utilities/communityColors";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { defaultMetadata } from "@/utilities/meta";
import { type SortByOptions, type StatusOptions } from "@/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { communitiesToBulkSubscribe } from "./receive-project-updates/page";

type Props = {
  params: {
    communityId: string;
  };
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query, params } = context;
  const communityId = params?.communityId as string;
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
          community = data;
        } catch {
          console.log("Not found community", communityId);
        }
      },
      async () => {
        const [data] = await fetchData(
          INDEXER.COMMUNITY.CATEGORIES(communityId as string)
        );
        if (data && data.length) {
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
    return {
      notFound: true,
    };
  }

  const defaultSortBy = (query.sortBy || "milestones") as SortByOptions;
  const defaultSelectedCategories = ((query.categories as string) || "")
    .split(",")
    .filter((category) => category.trim());
  const defaultSelectedStatus = (query.status || "all") as StatusOptions;

  return {
    props: {
      communityId,
      communityName:
        (community as ICommunityResponse)?.details?.data?.name || "",
      community: community as ICommunityResponse,
      categoriesOptions,
      defaultSortBy,
      defaultSelectedCategories,
      defaultSelectedStatus,
    },
  };
}

export default function Index({
  communityId,
  communityName,
  community,
  categoriesOptions,
  defaultSortBy,
  defaultSelectedCategories,
  defaultSelectedStatus,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dynamicMetadata = {
    title: `Karma GAP - ${communityName} community grants`,
    description: `View the list of grants issued by ${
      communityName || communityId
    } and the grantee updates.`,
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
      <div className="flex w-full max-w-full flex-col justify-between gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4">
        <div
          className="flex h-max w-full flex-row items-center justify-between gap-3 rounded-2xl p-6 max-lg:py-4  max-lg:flex-col"
          style={{
            backgroundColor:
              communityColors[community?.uid.toLowerCase() || "black"] ||
              "#000000",
          }}
        >
          <div className="flex flex-col gap-3 flex-1 items-center justify-center h-full">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img
                src={community?.details?.data?.imageURL}
                className={
                  "h-14 w-14 rounded-full border border-white p-1 max-lg:h-8 max-lg:w-8"
                }
              />
            </div>

            <p className="text-3xl font-semibold text-white max-2xl:text-2xl max-lg:text-xl">
              <span className={"font-body"}>
                {community ? community.details?.data?.name : ""}
              </span>{" "}
              Community Grants
            </p>
          </div>
          {/* {communitiesToBulkSubscribe.includes(
            community.details?.data.slug as string
          ) ? (
            <div className="flex flex-col gap-3 px-4 border-l border-l-zinc-300 h-full w-max  max-lg:border-t  max-lg:border-x-0  max-lg:border-t-zinc-300  max-lg:py-4">
              <Link
                href={PAGES.COMMUNITY.RECEIVEPROJECTUPDATES(
                  community.details?.data.slug as string
                )}
                className="text-white underline"
              >
                Receive Project Updates
              </Link>
            </div>
          ) : null} */}
        </div>

        <div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          <CommunityGrants
            categoriesOptions={categoriesOptions}
            defaultSelectedCategories={defaultSelectedCategories}
            defaultSortBy={defaultSortBy}
            defaultSelectedStatus={defaultSelectedStatus}
          />
          <CommunityFeed />
        </div>
      </div>
    </>
  );
}
