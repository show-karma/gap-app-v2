import type { Metadata } from "next";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { UpdatesPageClient } from "./UpdatesPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectOverviewMetadata(projectInfo, projectId);
}

/**
 * Updates page - the main/default tab for the project profile.
 * Shows the activity feed with milestones and updates.
 */
export default function UpdatesPage() {
  return <UpdatesPageClient />;
}
