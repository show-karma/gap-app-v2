import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { GrantOverviewPageClient } from "./GrantOverviewPageClient";

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
    return generateGrantOverviewMetadata(
      projectInfo,
      { details: { title: "", description: "" } } as never,
      projectId,
      grantUid
    );
  }

  return generateGrantOverviewMetadata(projectInfo, grant, projectId, grantUid);
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
  return <GrantOverviewPageClient />;
}
