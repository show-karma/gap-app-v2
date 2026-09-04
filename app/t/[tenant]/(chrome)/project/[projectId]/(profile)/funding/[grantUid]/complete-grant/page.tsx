import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { publicReadOptions } from "@/utilities/api/public-read";
import {
  generateGrantCompleteMetadata,
  generateProjectFundingMetadata,
} from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { CompleteGrantPageClient } from "./CompleteGrantPageClient";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId, grantUid } = await params;
  const [projectInfo, grants] = await Promise.all([
    getProjectCachedData(projectId),
    // Metadata is a shared, cacheable read: no token on the server, the same
    // public grant list the layout reads (D2).
    getProjectGrants(projectId, publicReadOptions()),
  ]);

  if (!projectInfo) {
    return { title: "Project Not Found", description: "Project not found" };
  }

  const grant = grants?.find((g) => g.uid?.toLowerCase() === grantUid?.toLowerCase());

  if (!grant) {
    return generateProjectFundingMetadata(projectInfo, projectId);
  }

  return generateGrantCompleteMetadata(projectInfo, grant, projectId, grantUid);
}

export default function Page() {
  return <CompleteGrantPageClient />;
}
