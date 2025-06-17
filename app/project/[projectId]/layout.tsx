/* eslint-disable @next/next/no-img-element */
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import ProjectHeaderLoading from "@/components/Pages/Project/Loading/Header";

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

  if (projectInfo?.pointers && projectInfo?.pointers?.length > 0) {
    const original = await gapIndexerApi
      .projectBySlug(projectInfo.pointers[0].data?.ogProjectUID)
      .then((res) => res.data)
      .catch(() => null);
    if (original) {
      redirect(`/project/${original.details?.data?.slug}`);
    }
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
  // TODO: Remove this once we have our API time running well
  // const project = await gapIndexerApi
  //   .projectBySlug(projectId)
  //   .then((res) => res.data)
  //   .catch(() => notFound());

  // if (!project || project.uid === zeroUID) {
  //   notFound();
  // }

  // if (project?.pointers && project?.pointers?.length > 0) {
  //   const original = await gapIndexerApi
  //     .projectBySlug(project.pointers[0].data?.ogProjectUID)
  //     .then((res) => res.data)
  //     .catch(() => null);
  //   if (original) {
  //     redirect(`/project/${original.details?.data?.slug}`);
  //   }
  // }

  return (
    <div className="flex flex-col gap-0">
      <ProjectWrapper projectId={projectId} />
      <div className="px-4 sm:px-6 lg:px-12">{children}</div>
    </div>
  );
}
