import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { ProjectRoadmap } from "@/components/Pages/Project/Roadmap";
import { getProjectUpdatesSeedCached } from "@/services/project.cached";
import { generateProjectUpdatesMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

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

  // The seed is built inside `"use cache"`: React Query stamps entries with
  // `Date.now()`, which cacheComponents rejects during prerender.
  const dehydratedState = await getProjectUpdatesSeedCached(projectId);

  return (
    <HydrationBoundary state={dehydratedState}>
      <ProjectRoadmap project={projectInfo} />
    </HydrationBoundary>
  );
}
