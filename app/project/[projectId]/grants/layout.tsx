import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { Spinner } from "@/components/Utilities/Spinner";
import { Suspense } from "react";
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";

import { Metadata } from "next";

import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

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
    title: `${projectInfo?.details?.data?.title} | Karma GAP`,
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
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: metadata.title,
      })),
      // site_name: defaultMetadata.openGraph.siteName,
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
  return (
    <Suspense
      fallback={
        <div className="flex flex-col w-full h-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <div className="w-full h-full">
        <GrantsLayout>{children}</GrantsLayout>
      </div>
    </Suspense>
  );
}
