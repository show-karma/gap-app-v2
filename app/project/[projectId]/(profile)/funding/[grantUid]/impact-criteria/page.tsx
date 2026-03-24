import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantImpactCriteriaMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { ImpactCriteriaPageClient } from "./ImpactCriteriaPageClient";

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
    return generateGrantImpactCriteriaMetadata(
      projectInfo,
      { details: { title: "", description: "" } } as never,
      projectId,
      grantUid
    );
  }

  return generateGrantImpactCriteriaMetadata(projectInfo, grant, projectId, grantUid);
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
  return <ImpactCriteriaPageClient />;
}
