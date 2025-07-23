/* eslint-disable @next/next/no-img-element */
import { CommunityGrants } from "@/components/CommunityGrants";
import type { SortByOptions, MaturityStageOptions } from "@/types";
import {
  getCommunityData,
  getCommunityCategories,
} from "@/utilities/queries/getCommunityData";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
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
    <div className="flex flex-col w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
      <CommunityGrants
        categoriesOptions={categoriesOptions}
        defaultSelectedCategories={defaultSelectedCategories}
        defaultSortBy={defaultSortBy}
        defaultSelectedMaturityStage={defaultSelectedMaturityStage}
        communityUid={(community as ICommunityResponse).uid}
      />
    </div>
  );
}
