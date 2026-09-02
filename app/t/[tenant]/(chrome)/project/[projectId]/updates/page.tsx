import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { getProjectUpdatesCached } from "@/services/project.cached";
import { generateProjectUpdatesMetadata } from "@/utilities/metadata/projectMetadata";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { QUERY_KEYS } from "@/utilities/queryKeys";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Project Updates" };
  }

  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);

  if (!projectInfo) {
    return {
      title: "Project Not Found",
      description: "Project not found",
    };
  }

  return generateProjectUpdatesMetadata(projectInfo, projectId);
}

export default async function RoadmapPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await props.params;

  // Skip server-side data fetching during E2E tests — Cypress intercepts
  // only work client-side, and the staging API may be unreachable from CI.
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return <ProjectRoadmap project={null as never} />;
  }

  const projectInfo = await getProjectCachedData(projectId);

  if (!projectInfo) {
    return null;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: defaultQueryOptions,
    },
  });

  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.PROJECT.UPDATES(projectId),
    // The cached twin: the raw loader defaults isAuthorized to true and reaches
    // cookies(), which the build reported on this route as
    // HANGING_PROMISE_REJECTION at project-updates.service.ts:107.
    queryFn: () => getProjectUpdatesCached(projectId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRoadmap project={projectInfo} />
    </HydrationBoundary>
  );
}
