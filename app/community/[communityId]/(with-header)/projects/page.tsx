import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityGrants } from "@/components/CommunityGrants";
import { PROJECT_NAME } from "@/constants/brand";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { PAGES } from "@/utilities/pages";
import {
  COMMUNITY_PROJECTS_PAGE_SIZE,
  type CommunityProjectsSearchParams,
  DEFAULT_COMMUNITY_SORT,
  mapSortToApiValue,
  parseCommunityProjectsPage,
} from "@/utilities/queries/v2/communityProjectsRequest";
import {
  getCommunityCategories,
  getCommunityDetails,
  getCommunityProjects,
} from "@/utilities/queries/v2/getCommunityData";

type Props = {
  params: Promise<{
    communityId: string;
  }>;
  searchParams: Promise<CommunityProjectsSearchParams>;
};

// Self-canonical with its own title/description. Without this the page inherits
// the community layout's metadata, so a sitemap-listed URL pointed its canonical
// at `/community/<id>` and duplicated the root's title.
export async function generateMetadata({ params }: { params: Props["params"] }): Promise<Metadata> {
  const { communityId } = await params;
  const [community, canonicalMetadata] = await Promise.all([
    getCommunityDetails(communityId),
    communitySubpageMetadata(communityId, "projects"),
  ]);
  const communityName = community?.details?.name || communityId;

  return {
    ...canonicalMetadata,
    title: `${communityName} Funded Projects | ${PROJECT_NAME}`,
    description: `Browse every project funded by ${communityName}. Filter by category and maturity stage, and follow grantee milestones and impact on ${PROJECT_NAME}.`,
  };
}

export default async function CommunityProjectsPage(props: Props) {
  const { communityId } = await props.params;
  // Fetch the exact request the client's first query would issue (page + explicit
  // sort) so the server payload can seed React Query instead of being replaced by
  // a differently-ordered refetch.
  const page = parseCommunityProjectsPage(await props.searchParams);

  const [communityDetails, categories, initialProjects] = await Promise.all([
    getCommunityDetails(communityId),
    getCommunityCategories(communityId),
    getCommunityProjects(communityId, {
      page,
      limit: COMMUNITY_PROJECTS_PAGE_SIZE,
      sortBy: mapSortToApiValue(DEFAULT_COMMUNITY_SORT),
    }),
  ]);

  const categoriesOptions = categories
    .map((cat) => cat.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  if (!communityDetails) {
    notFound();
  }

  const defaultSortBy: SortByOptions = DEFAULT_COMMUNITY_SORT;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

  return (
    <div className="-my-4 flex flex-col w-full max-w-full py-2 animate-fade-in-up">
      <CommunityGrants
        categoriesOptions={categoriesOptions}
        defaultSelectedCategories={defaultSelectedCategories}
        defaultSortBy={defaultSortBy}
        defaultSelectedMaturityStage={defaultSelectedMaturityStage}
        communityUid={communityDetails.uid}
        initialProjects={initialProjects}
        initialPage={page}
        paginationBasePath={PAGES.COMMUNITY.PROJECTS(communityId)}
      />
    </div>
  );
}
