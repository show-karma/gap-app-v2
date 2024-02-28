import React from "react";
import { defaultMetadata, INDEXER } from "@/utilities";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { NextSeo } from "next-seo";
import { Community } from "@show-karma/karma-gap-sdk";
import { CommunityGrants } from "@/components/CommunityGrants";
import { CommunityFeed } from "@/components/CommunityFeed";
import { communityColors } from "@/utilities/communityColors";
import fetchData from "@/utilities/fetchData";
import { SortByOptions, StatusOptions } from "@/types";

type Props = {
  params: {
    communityId: string;
  };
};

// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   const { communityId } = params;
//   let name: string | undefined;
//   try {
//     const communityInfo = await getMetadata<ICommunityDetails>(
//       "communities",
//       communityId as Hex
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
//     title: `Karma GAP - ${name || communityId} community grants`,
//     description: `View the list of grants issued by ${
//       name || communityId
//     } and the grantee updates.`,
//     openGraph: {
//       ...ogMeta,
//       title: `Karma GAP - ${name || communityId} community grants`,
//       description: `View the list of grants issued by ${
//         name || communityId
//       } and the grantee updates.`,
//       // images: [imageURL || ''],
//     },
//     twitter: {
//       ...twitterMeta,
//       title: `Karma GAP - ${
//         name || communityId || communityId
//       } community grants`,
//       description: `View the list of grants issued by ${
//         name || communityId
//       } and the grantee updates.`,
//     },
//   };
// }
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query, params } = context;
  const communityId = params?.communityId as string;
  let community: Community | null = null;
  let categoriesOptions: string[] = [];

  await Promise.all(
    [
      async () => {
        const [data, error, pageInfo]: any = await fetchData(
          INDEXER.COMMUNITY.GET(communityId as string)
        );

        if (data) {
          community = data as Community;
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
      communityName: (community as Community)?.details?.data?.name || "",
      community: community as Community,
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
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/favicon.png",
          },
        ]}
      />
      <div className="flex w-full max-w-full flex-col justify-between gap-6 px-12 pb-7 pt-5 max-2xl:px-8 max-md:px-4">
        <div
          className="flex h-max w-full flex-col items-center justify-center gap-3 rounded-2xl p-6 max-lg:py-4"
          style={{
            backgroundColor:
              communityColors[community?.uid.toLowerCase() || "black"] ||
              "#000000",
          }}
        >
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
