/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { CommunityGrants } from "@/components/CommunityGrants";
import { PROJECT_NAME } from "@/constants/brand";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
import {
  getCommunityCategories,
  getCommunityDetails,
  getCommunityProjects,
} from "@/utilities/queries/v2/getCommunityData";

type Props = {
  params: Promise<{
    communityId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `${communityName} Community Grants | ${PROJECT_NAME}`,
    description: `Browse the full list of grants and funded projects by ${communityName}. Filter by category, track milestones, and explore grantee progress on ${PROJECT_NAME}.`,
  };
}

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  const [communityDetails, categories, initialProjects] = await Promise.all([
    getCommunityDetails(communityId),
    getCommunityCategories(communityId),
    getCommunityProjects(communityId, { page: 1, limit: 12 }),
  ]);

  // Extract category names for the filter
  const categoriesOptions = categories
    .map((cat) => cat.name)
    .sort((a, b) => a.localeCompare(b, "en"));

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
        initialProjects={initialProjects}
      />
    </div>
  );
}
