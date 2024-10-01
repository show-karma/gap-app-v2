import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { Spinner } from "@/components/Utilities/Spinner";
import { Suspense } from "react";
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";

import { Metadata } from "next";

import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { envVars } from "@/utilities/enviromentVars";
import { ProjectGrantsLayoutLoading } from "@/components/Pages/Project/Loading/Grants/Layout";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;

  const projectInfo = await gapIndexerApi
    .projectBySlug(projectId)
    .then((res) => res.data)
    .catch(() => notFound());

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }
  let metadata = {
    title: defaultMetadata.title,
    description: defaultMetadata.description,
    twitter: defaultMetadata.twitter,
    openGraph: defaultMetadata.openGraph,
    icons: defaultMetadata.icons,
  };

  metadata = {
    ...metadata,
    title: `${projectInfo?.details?.data?.title} Grants | Karma GAP`,
    description:
      projectInfo?.details?.data?.description?.substring(0, 80) || "",
  };

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
    },
    icons: metadata.icons,
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

  if (!project || project?.uid === zeroUID) {
    notFound();
  }

  return (
    <div className="w-full h-full">
      <Suspense
        fallback={
          <ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>
        }
      >
        <GrantsLayout project={project}>{children}</GrantsLayout>
      </Suspense>
    </div>
  );
}
