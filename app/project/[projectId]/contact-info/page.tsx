/* eslint-disable @next/next/no-img-element */
import React from "react";

import { Hex } from "viem";
import { Metadata } from "next";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId } = await params;

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
    description:
      cleanMarkdownForPlainText(
        projectInfo.details?.data.description || "",
        80
      ) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.data.title} | Karma GAP`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `${projectInfo.details?.data.title} | Karma GAP`,
      description:
        cleanMarkdownForPlainText(
          projectInfo.details?.data.description || "",
          80
        ) || "",

      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.data.title} | Karma GAP`,
        },
      ],
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
