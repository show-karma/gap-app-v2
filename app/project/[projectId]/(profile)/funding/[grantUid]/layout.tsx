import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { GrantDetailLayoutClient } from "./GrantDetailLayoutClient";

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

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Grant Detail Layout for V2 Profile
 *
 * This layout provides:
 * - Back button to return to funding list
 * - Grant title with edit/delete actions
 * - Tab navigation (Overview, Milestones and Updates, Impact Criteria)
 *
 * Used within the (profile) route group to maintain the main project profile layout
 * while showing grant-specific content.
 */
export default function Layout({ children }: LayoutProps) {
  return <GrantDetailLayoutClient>{children}</GrantDetailLayoutClient>;
}
