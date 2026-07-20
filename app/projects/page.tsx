import { Suspense } from "react";
import {
  ProjectsExplorer,
  ProjectsHeroSection,
  ProjectsLoading,
  ProjectsStatsSection,
} from "@/components/Pages/Projects";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import { errorManager } from "@/components/Utilities/errorManager";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { getExplorerProjectsPaginated } from "@/services/projects-explorer.service";
import type { PaginatedProjectsResponse } from "@/types/v2/project";
import { customMetadata } from "@/utilities/meta";
import {
  type ProjectsExplorerSearchParams,
  type ProjectsExplorerState,
  parseProjectsExplorerRequest,
} from "@/utilities/projects-explorer-request";

export const metadata = customMetadata({
  title: "Explore Grant-Funded Projects",
  description:
    "Discover thousands of projects using Karma to track grants, share progress, and build reputation. Explore projects making a difference across funding ecosystems.",
  path: "/projects",
});

export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<ProjectsExplorerSearchParams>;
}) {
  // Parse the request up front, then stream: the hero + JSON-LD render
  // immediately while the indexer fetch is deferred into the Suspense boundary
  // below (Vercel async-defer guidance). The route never blocks on the network.
  const initialState = parseProjectsExplorerRequest(await searchParams);

  return (
    <main className="flex flex-col w-full">
      <CollectionPageJsonLd
        name="Explore Grant-Funded Projects"
        description="Discover thousands of projects using Karma to track grants, share progress, and build reputation. Explore projects making a difference across funding ecosystems."
        url="/projects"
      />
      <ProjectsHeroSection />
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsExplorerLoader initialState={initialState} />
      </Suspense>
      <ProjectsStatsSection />
    </main>
  );
}

/**
 * Deferred data boundary: the only place the first page is fetched. A failure
 * degrades to a client-only render (no seed) so React Query can retry; the
 * effective request state is always handed to the explorer.
 */
async function ProjectsExplorerLoader({ initialState }: { initialState: ProjectsExplorerState }) {
  let initialData: PaginatedProjectsResponse | undefined;
  try {
    initialData = await getExplorerProjectsPaginated({
      search: initialState.q,
      page: initialState.page,
      limit: PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT,
      sortBy: initialState.sortBy,
      sortOrder: initialState.sortOrder,
      includeStats: true,
      hasPayoutAddress: initialState.raisingFunds,
    });
  } catch (error) {
    // Fail closed: degrade to a client-only render (React Query retries with no
    // seed). Record the failure through the shared Sentry pipeline for
    // observability, with a route-scoped context that deliberately omits the
    // request query / user data (transient network/gateway errors are dropped
    // inside errorManager, so this stays quiet under normal upstream blips).
    errorManager("SSR /projects seed fetch failed; degrading to client render", error, {
      context: "app/projects/page",
    });
    initialData = undefined;
  }

  return <ProjectsExplorer initialData={initialData} initialState={initialState} />;
}
