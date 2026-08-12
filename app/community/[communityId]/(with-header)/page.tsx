/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityGrants } from "@/components/CommunityGrants";
import { ItemListJsonLd } from "@/components/Seo/ItemListJsonLd";
import { PROJECT_NAME } from "@/constants/brand";
import type { MaturityStageOptions, SortByOptions } from "@/types";
import { PAGES } from "@/utilities/pages";
import { pagesOnRoot } from "@/utilities/pagesOnRoot";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId } = await params;
  const community = await getCommunityDetails(communityId);
  const communityName = community?.details?.name || communityId;

  return {
    title: `${communityName} Community Grants | ${PROJECT_NAME}`,
    description: `Browse the full list of grants and funded projects by ${communityName}. Filter by category, track milestones, and explore grantee progress on ${PROJECT_NAME}.`,
  };
}

// Filter query params the client hub reads through nuqs. When any is present
// the server payload (fetched unfiltered) is not what the page renders — the
// client refetches with the filters applied — so the JSON-LD ItemList below
// must not describe it (DEV-596).
const FILTER_SEARCH_PARAMS = [
  "categories",
  "sortBy",
  "maturityStage",
  "programId",
  "trackIds",
] as const;

export default async function Page(props: Props) {
  const { communityId } = await props.params;

  if (pagesOnRoot.includes(communityId)) {
    return undefined;
  }

  // Fetch the exact request the client's first query would issue (page + explicit
  // sort) so the server payload can seed React Query instead of being replaced by
  // a differently-ordered refetch.
  const searchParams = (await props.searchParams) ?? {};
  const page = parseCommunityProjectsPage(searchParams);

  const [communityDetails, categories, initialProjects] = await Promise.all([
    getCommunityDetails(communityId),
    getCommunityCategories(communityId),
    getCommunityProjects(communityId, {
      page,
      limit: COMMUNITY_PROJECTS_PAGE_SIZE,
      sortBy: mapSortToApiValue(DEFAULT_COMMUNITY_SORT),
    }),
  ]);

  // Extract category names for the filter
  const categoriesOptions = categories
    .map((cat) => cat.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  if (!communityDetails) {
    notFound();
  }

  const defaultSortBy: SortByOptions = DEFAULT_COMMUNITY_SORT;
  const defaultSelectedCategories: string[] = [];
  const defaultSelectedMaturityStage = "all" as MaturityStageOptions;

  // JSON-LD ItemList of exactly the project entities the server renders
  // (DEV-596): the seeded page of the hub, in its rendered order. With filter
  // params in the URL the server ships a skeleton (the seed is rejected), so
  // no schema ships either.
  const hasFilterParams = FILTER_SEARCH_PARAMS.some((key) => searchParams[key] !== undefined);
  const listedProjects = hasFilterParams
    ? []
    : (initialProjects?.payload ?? []).filter((project) => Boolean(project.details?.title));

  return (
    <div className="-my-4 flex flex-col w-full max-w-full py-2">
      <ItemListJsonLd
        name={`${communityDetails.details?.name || communityId} funded projects`}
        items={listedProjects.map((project) => ({
          name: project.details.title,
          url: PAGES.PROJECT.OVERVIEW(project.details.slug || project.uid),
        }))}
      />
      <CommunityGrants
        categoriesOptions={categoriesOptions}
        defaultSelectedCategories={defaultSelectedCategories}
        defaultSortBy={defaultSortBy}
        defaultSelectedMaturityStage={defaultSelectedMaturityStage}
        communityUid={communityDetails.uid}
        initialProjects={initialProjects}
        initialPage={page}
        paginationBasePath={PAGES.COMMUNITY.ALL_GRANTS(communityId)}
      />
    </div>
  );
}
