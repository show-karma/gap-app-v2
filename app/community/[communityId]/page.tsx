/* eslint-disable @next/next/no-img-element */
import { CommunityGrants } from "@/components/CommunityGrants";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import { getCommunityCategories } from "@/utilities/queries/getCommunityData";
import {
  getCommunityDetailsV2,
  getCommunityProjectsV2,
  getCommunityStatsV2,
} from "@/utilities/queries/getCommunityDataV2";

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

  // Layout handles notFound, but TypeScript needs this check
  if (!communityDetails) {
    return null;
  }

  const defaultSortBy = "milestones" as SortByOptions;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

  return (
    <div className="-my-4 flex flex-col w-full max-w-full py-2">
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
  );
}
