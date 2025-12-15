import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Team } from "@/components/Pages/Project/Team";
import { zeroUID } from "@/utilities/commons";
import { generateProjectTeamMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;

  const projectInfo = await getProjectCachedData(projectId);

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      title: "Not Found",
      description: "Project not found",
    };
  }

  return generateProjectTeamMetadata(projectInfo, projectId);
}

const TeamPage = async (props: { params: Promise<{ projectId: string }> }) => {
  const { projectId } = await props.params;

  const projectInfo = await getProjectCachedData(projectId);

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }

  return <Team />;
};

export default TeamPage;
