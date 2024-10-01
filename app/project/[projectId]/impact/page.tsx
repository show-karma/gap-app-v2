/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Metadata } from "next";
import { Hex } from "viem";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";
import ImpactWrapper from "@/components/Pages/Project/Impact/ImpactWrapper";
import { ProjectImpactLoading } from "@/components/Pages/Project/Loading/Impact";

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
    title: `View Impact for ${projectInfo.details?.data?.title} | Karma GAP`,
    description: projectInfo.details?.data?.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `View Impact for ${projectInfo.details?.data?.title} | Karma GAP`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `View Impact for ${projectInfo.details?.data?.title} | Karma GAP`,
      description:
        projectInfo.details?.data?.description?.substring(0, 80) || "",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `View Impact for ${projectInfo.details?.data?.title} | Karma GAP`,
        },
      ],
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default function Page() {
  return <ImpactWrapper />;
}
