import React from "react";
import { Hex } from "viem";
import { Metadata } from "next";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/utilities/enviromentVars";
import { Team } from "@/components/Pages/Project/Team";
import { notFound } from "next/navigation";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";

export async function generateMetadata(props: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await props.params;

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
    title: `${projectInfo.details?.data?.title} | Karma GAP`,
    description:
      cleanMarkdownForPlainText(
        projectInfo.details?.data?.description || "",
        80
      ) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.data?.title} | Karma GAP`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `${projectInfo.details?.data?.title} | Karma GAP`,
      description:
        cleanMarkdownForPlainText(
          projectInfo.details?.data?.description || "",
          80
        ) || "",

      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `${projectInfo.details?.data?.title} | Karma GAP`,
        },
      ],
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

const TeamPage = async (props: { params: Promise<{ projectId: string }> }) => {
  const { projectId } = await props.params;

  const projectInfo = await getMetadata<IProjectResponse>(
    "project",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }

  return <Team />;
};

export default TeamPage;
