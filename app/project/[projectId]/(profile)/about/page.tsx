import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutContentServer } from "@/components/Pages/Project/v2/MainContent/AboutContentServer";
import { AboutScrollHandler } from "@/components/Pages/Project/v2/MainContent/AboutScrollHandler";
import { generateProjectAboutMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectAboutMetadata(projectInfo, projectId);
}

/**
 * About page - server-renders the project's description, mission, problem,
 * solution, and other details so the unique content is present in the initial
 * HTML for search engines (was previously a client-only loading skeleton).
 */
export default async function AboutPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const project = await getProjectCachedData(projectId);

  return (
    <>
      <Suspense fallback={null}>
        <AboutScrollHandler />
      </Suspense>
      <AboutContentServer project={project} />
    </>
  );
}
