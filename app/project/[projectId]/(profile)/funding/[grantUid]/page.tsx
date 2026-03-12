import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getProjectGrants } from "@/services/project-grants.service";
import {
  generateGrantOverviewMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const GrantOverviewClient = dynamic(() => import("./GrantOverviewClient"));

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Grant Overview" };
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

  return generateGrantOverviewMetadata(project, grant, projectId, grantUid);
}

/**
 * Grant Overview Page (V2)
 *
 * Displays grant overview content:
 * - Completion summary (if completed)
 * - Grant description
 * - Grant overview card (community, network, tracks, proposal, amount, start date)
 * - Fund usage breakdown (if available)
 */
export default function GrantOverviewPage() {
  return <GrantOverviewClient />;
}
