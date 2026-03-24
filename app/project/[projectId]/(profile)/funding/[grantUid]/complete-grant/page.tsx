import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantCompleteMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { CompleteGrantPageClient } from "./CompleteGrantPageClient";

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
    return generateGrantCompleteMetadata(
      projectInfo,
      { details: { title: "", description: "" } } as never,
      projectId,
      grantUid
    );
  }

  return generateGrantCompleteMetadata(projectInfo, grant, projectId, grantUid);
}

export default function Page() {
  return <CompleteGrantPageClient />;
}
