import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getProjectGrants } from "@/services/project-grants.service";
import {
  generateGrantMilestonesMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const MilestonesAndUpdatesClient = dynamic(() => import("./MilestonesAndUpdatesClient"));

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Grant Milestones and Updates" };
  }

  const { projectId, grantUid } = await params;
  const project = await getProjectCachedData(projectId);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "Project not found",
    };
  }

  const grants = await getProjectGrants(projectId);
  const grant = grants?.find((g) => g.uid?.toLowerCase() === grantUid?.toLowerCase());

  if (!grant) {
    return generateProjectFundingMetadata(project, projectId);
  }

  return generateGrantMilestonesMetadata(project, grant, projectId, grantUid);
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
  return <MilestonesAndUpdatesClient />;
}
