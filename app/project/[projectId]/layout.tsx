/* eslint-disable @next/next/no-img-element */
import { fetchMetadata } from "frames.js/next/pages-router/client";
import { envVars } from "@/utilities/enviromentVars";
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import ProjectHeaderLoading from "@/components/Pages/Project/Loading/Header";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";

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

  const dynamicMetadata = {
    title: `${projectInfo.details?.data?.title} | Karma GAP`,
    description:
      cleanMarkdownForPlainText(
        projectInfo.details?.data?.description || "",
        160
      ) || "",
  };

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      handle: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      cardType: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
    additionalLinkTags: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  };
}

export default async function RootLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const project = await gapIndexerApi
    .projectBySlug(projectId)
    .then((res) => res.data)
    .catch(() => notFound());

  if (!project || project.uid === zeroUID) {
    notFound();
  }

  if (project?.pointers && project?.pointers?.length > 0) {
    const original = await gapIndexerApi
      .projectBySlug(project.pointers[0].data?.ogProjectUID)
      .then((res) => res.data)
      .catch(() => null);
    if (original) {
      redirect(`/project/${original.details?.data?.slug}`);
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <Suspense fallback={<ProjectHeaderLoading />}>
        <ProjectWrapper projectId={projectId} project={project} />
      </Suspense>
      <div className="px-4 sm:px-6 lg:px-12">{children}</div>
    </div>
  );
}
