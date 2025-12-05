/* eslint-disable @next/next/no-img-element */

import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { Metadata } from "next";
import type { Hex } from "viem";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";
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
    return {
      title: "Not Found",
      description: "Project not found",
    };
  }

  return {
    title: `${projectInfo.details?.title} | ${PROJECT_NAME}`,
    description: cleanMarkdownForPlainText(projectInfo.details?.description || "", 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.title} | ${PROJECT_NAME}`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `${projectInfo.details?.title} | ${PROJECT_NAME}`,
      description: cleanMarkdownForPlainText(projectInfo.details?.description || "", 80) || "",

      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.title} | ${PROJECT_NAME}`,
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
