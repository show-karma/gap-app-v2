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
    title: `Karma GAP - ${projectInfo.details?.data.title}`,
    description: projectInfo.details?.data.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `Karma GAP - ${projectInfo.details?.data.title}`,
      description:
        projectInfo.details?.data.description?.substring(0, 80) || "",
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: `Karma GAP - ${projectInfo.details?.data.title}`,
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
