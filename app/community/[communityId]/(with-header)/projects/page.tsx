import { notFound } from "next/navigation";
import { CommunityGrants } from "@/components/CommunityGrants";
import type { MaturityStageOptions, SortByOptions } from "@/types";
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

export default async function CommunityProjectsPage(props: Props) {
  const { communityId } = await props.params;

  const [communityDetails, categories, initialProjects] = await Promise.all([
    getCommunityDetails(communityId),
    getCommunityCategories(communityId),
    getCommunityProjects(communityId, { page: 1, limit: 12 }),
  ]);

  const categoriesOptions = categories
    .map((cat) => cat.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  if (!communityDetails) {
    notFound();
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
