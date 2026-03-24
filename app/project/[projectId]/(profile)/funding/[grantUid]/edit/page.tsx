import type { Metadata } from "next";
import { getProjectGrants } from "@/services/project-grants.service";
import { generateGrantEditMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { EditGrantPageClient } from "./EditGrantPageClient";

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
    return generateGrantEditMetadata(
      projectInfo,
      { details: { title: "", description: "" } } as never,
      projectId,
      grantUid
    );
  }

  return generateGrantEditMetadata(projectInfo, grant, projectId, grantUid);
}

export default function Page() {
  return <EditGrantPageClient />;
}
