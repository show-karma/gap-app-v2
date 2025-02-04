/* eslint-disable @next/next/no-img-element */
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityGrants } from "@/components/CommunityGrants";
import { ReceiveProjectUpdates } from "@/components/Pages/ReceiveProjectUpdates";
import type { SortByOptions, StatusOptions } from "@/types";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { communitiesToBulkSubscribe } from "@/utilities/subscribe";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { notFound } from "next/navigation";

type Props = {
  params: {
    communityId: string;
  };
};

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
        } catch (error) {
          console.log("Not found community", communityId, error );
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
    <div className="flex flex-row gap-6 w-full max-w-full">
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
        <div className="w-full lg:hidden">
          {communitiesToBulkSubscribe.includes(
            (community as ICommunityResponse)?.details?.data?.slug as string
          ) ? (
            <ReceiveProjectUpdates
              communityName={
                (community as ICommunityResponse)?.details?.data?.name || ""
              }
            />
          ) : null}
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
          (community as ICommunityResponse)?.details?.data?.slug as string
        ) ? (
          <ReceiveProjectUpdates
            communityName={
              (community as ICommunityResponse)?.details?.data?.name || ""
            }
          />
        ) : null}
        <CommunityFeed />
      </div>
    </div>
  );
}
