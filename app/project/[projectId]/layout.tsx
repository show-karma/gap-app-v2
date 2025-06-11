/* eslint-disable @next/next/no-img-element */
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import { zeroUID } from "@/utilities/commons";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import ProjectHeaderLoading from "@/components/Pages/Project/Loading/Header";
import { ProjectDataProvider } from "./providers/ProjectDataProvider";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;

  const projectInfo = await gapIndexerApi
    .projectBySlug(projectId)
    .then((res) => res.data)
    .catch(() => notFound());

  if (!projectInfo || projectInfo?.uid === zeroUID) {
    notFound();
  }

  return generateProjectOverviewMetadata(projectInfo, projectId);
}

export default async function RootLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <ProjectDataProvider projectId={projectId}>
      <div className="flex flex-col gap-0">
        <Suspense fallback={<ProjectHeaderLoading />}>
          <ProjectWrapper projectId={projectId} />
        </Suspense>
        <div className="px-4 sm:px-6 lg:px-12">{children}</div>
      </div>
    </ProjectDataProvider>
  );
}
