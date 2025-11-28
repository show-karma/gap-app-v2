/* eslint-disable @next/next/no-img-element */

import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Hex } from "viem";
import ImpactWrapper from "@/components/Pages/Project/Impact/ImpactWrapper";
import { PROJECT_NAME } from "@/constants/brand";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { getMetadata } from "@/utilities/sdk";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;

  const projectInfo = await getMetadata<IProjectResponse>("project", projectId as Hex);

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }

  return {
    title: `Impact of ${projectInfo.details?.data?.title} | ${PROJECT_NAME}`,
    description: cleanMarkdownForPlainText(projectInfo.details?.data?.description || "", 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `Impact of ${projectInfo.details?.data?.title} | ${PROJECT_NAME}`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `Impact of ${projectInfo.details?.data?.title} | ${PROJECT_NAME}`,
      description: cleanMarkdownForPlainText(projectInfo.details?.data?.description || "", 80),
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `Impact of ${projectInfo.details?.data?.title} | ${PROJECT_NAME}`,
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
