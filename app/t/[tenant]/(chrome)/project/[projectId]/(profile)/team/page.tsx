import type { Metadata } from "next";
import { generateProjectTeamMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { TeamPageClient } from "./TeamPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectTeamMetadata(projectInfo, projectId);
}

/**
 * Team page - displays the list of team members for the project.
 */
export default function TeamPage() {
  return <TeamPageClient />;
}
