/* eslint-disable @next/next/no-img-element */
import { fetchMetadata } from "frames.js/next/pages-router/client";
import { envVars } from "@/utilities/enviromentVars";
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import { Spinner } from "@/components/Utilities/Spinner";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

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

  const dynamicMetadata = {
    title: `Karma GAP - ${projectInfo.details?.data?.title}`,
    description:
      projectInfo.details?.data?.description?.substring(0, 160) || "",
  };

  const framesAdditionalMetatags = Object.entries(
    await fetchMetadata(
      new URL(
        `/api/frames/${projectId}?projectInfo=${
          // Base64 encoded projectInfo
          encodeURIComponent(
            Buffer.from(JSON.stringify(projectInfo)).toString("base64")
          )
        }`,
        envVars.VERCEL_URL
      )
    )
  ).map(([key, value]) => ({
    name: key,
    content: String(value),
  }));

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      handle: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      cardType: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: dynamicMetadata.title || defaultMetadata.title,
      })),
    },
    additionalLinkTags: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
    additionalMetaTags: framesAdditionalMetatags,
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

  return (
    <Suspense
      fallback={
        <div className="flex flex-col w-full h-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <div>
        <ProjectWrapper projectId={projectId} project={project} />
        <div className="px-4 sm:px-6 lg:px-12">{children}</div>
      </div>
    </Suspense>
  );
}
