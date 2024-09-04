/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Metadata } from "next";
import { Hex } from "viem";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import dynamic from "next/dynamic";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  const projectInfo = await getMetadata<IProjectResponse>(
    "project",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }

  return {
    title: `${projectInfo.details?.data?.title} | Karma GAP`,
    description: projectInfo.details?.data?.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `${projectInfo.details?.data?.title} | Karma GAP`,
      description:
        projectInfo.details?.data?.description?.substring(0, 80) || "",
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: `${projectInfo.details?.data?.title} | Karma GAP`,
      })),
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

const ImpactComponent = dynamic(
  () =>
    import("@/components/Pages/Project/Impact").then(
      (mod) => mod.ImpactComponent
    ),
  {
    loading: () => <DefaultLoading />,
  }
);

const ImpactPage = () => {
  return (
    <div className="pt-5 pb-20">
      <ImpactComponent />
    </div>
  );
};

export default ImpactPage;
