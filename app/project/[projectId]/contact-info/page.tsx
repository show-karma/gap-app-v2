/* eslint-disable @next/next/no-img-element */
import React from "react";

import { Hex } from "viem";
import { Metadata } from "next";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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
    return {
      title: "Not Found",
      description: "Project not found",
    };
  }

  return {
    title: `${projectInfo.details?.data.title} | Karma GAP`,
    description: projectInfo.details?.data.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `${projectInfo.details?.data.title} | Karma GAP`,
      description:
        projectInfo.details?.data.description?.substring(0, 80) || "",
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: `${projectInfo.details?.data.title} | Karma GAP`,
      })),
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

function Page() {
  return <ContactInfoPage />;
}

export default Page;
