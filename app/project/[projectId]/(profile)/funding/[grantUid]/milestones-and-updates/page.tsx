import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantMilestonesMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { MilestonesAndUpdatesPageClient } from "./MilestonesAndUpdatesPageClient";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId, grantUid } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  const grants = await getProjectGrants(projectId);
  const grant = grants.find((g) => g.uid === grantUid);

  if (!grant) {
    return generateGrantMilestonesMetadata(
      projectInfo,
      { details: { title: "", description: "" } } as never,
      projectId,
      grantUid
    );
  }

  return generateGrantMilestonesMetadata(projectInfo, grant, projectId, grantUid);
}

/**
 * Grant Milestones and Updates Page (V2)
 *
 * Displays grant milestones and updates timeline with:
 * - Milestone creation for authorized users
 * - Progress tracking
 * - Update history
 */
export default function MilestonesAndUpdatesPage() {
  return <MilestonesAndUpdatesPageClient />;
}
