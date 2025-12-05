import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { getProjectUpdates } from "@/services/project-updates.service";
import { generateProjectUpdatesMetadata } from "@/utilities/metadata/projectMetadata";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
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
    queryKey: ["project-updates", projectId],
    queryFn: () => getProjectUpdates(projectId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectRoadmap project={projectInfo} />
    </HydrationBoundary>
  );
}
