/* eslint-disable @next/next/no-img-element */
import { CommunityGrants } from "@/components/CommunityGrants";
import type { SortByOptions, MaturityStageOptions } from "@/types";
import {
  getCommunityCategories,
} from "@/utilities/queries/getCommunityData";
import {
  getCommunityDetailsV2,
  getCommunityStatsV2,
  getCommunityProjectsV2,
} from "@/utilities/queries/getCommunityDataV2";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";

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

  const [communityDetails, communityStats, categoriesOptions, initialProjects] = await Promise.all([
    getCommunityDetailsV2(communityId),
    getCommunityStatsV2(communityId),
    getCommunityCategories(communityId),
    getCommunityProjectsV2(communityId, { page: 1, limit: 12 }),
  ]);

  const defaultSortBy = "milestones" as SortByOptions;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

  return (
    <div className="flex flex-row gap-6 w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
      <div className="flex w-full max-w-full flex-col justify-start items-center gap-6">
        <div className="flex gap-8 flex-row max-lg:flex-col-reverse w-full">
          <CommunityGrants
            categoriesOptions={categoriesOptions}
            defaultSelectedCategories={defaultSelectedCategories}
            defaultSortBy={defaultSortBy}
            defaultSelectedMaturityStage={defaultSelectedMaturityStage}
            communityUid={communityDetails.uid}
            communityStats={communityStats}
            initialProjects={initialProjects}
          />
        </div>
      </div>
    </div>
  );
}
