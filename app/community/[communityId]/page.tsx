/* eslint-disable @next/next/no-img-element */
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityGrants } from "@/components/CommunityGrants";
import { ReceiveProjectUpdates } from "@/components/Pages/ReceiveProjectUpdates";
import type { SortByOptions, MaturityStageOptions } from "@/types";
import {
  getCommunityData,
  getCommunityCategories,
} from "@/utilities/queries/getCommunityData";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { communitiesToBulkSubscribe } from "@/utilities/subscribe";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

type Props = {
  params: Promise<{
    communityId: string;
  }>;
};

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const [community, categoriesOptions] = await Promise.all([
    getCommunityData(communityId),
    getCommunityCategories(communityId),
  ]);

  const defaultSortBy = "milestones" as SortByOptions;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

  return (
    <div className="flex flex-row gap-6 w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
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
            defaultSelectedMaturityStage={defaultSelectedMaturityStage}
            communityUid={(community as ICommunityResponse).uid}
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
