import type { Metadata } from "next";
import { generateProjectAboutMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { AboutPageClient } from "./AboutPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectAboutMetadata(projectInfo, projectId);
}

/**
 * About page - displays project details like description, mission, problem, solution.
 */
export default function AboutPage() {
  return <AboutPageClient />;
}
