import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getProjectGrants } from "@/services/project-grants.service";
import {
  generateGrantImpactCriteriaMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const ImpactCriteriaClient = dynamic(() => import("./ImpactCriteriaClient"));

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Grant Impact Criteria" };
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

  return generateGrantImpactCriteriaMetadata(project, grant, projectId, grantUid);
}

/**
 * Grant Impact Criteria Page (V2)
 *
 * Displays impact criteria for the grant:
 * - Impact goals and outcomes
 * - Success metrics
 * - Evaluation criteria
 */
export default function ImpactCriteriaPage() {
  return <ImpactCriteriaClient />;
}
