/* eslint-disable @next/next/no-img-element */
import ImpactWrapper from "@/components/Pages/Project/Impact/ImpactWrapper";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { getMetadata } from "@/utilities/sdk";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hex } from "viem";

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
    title: `Impact of ${projectInfo.details?.data?.title} | Karma GAP`,
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
          alt: `Impact of ${projectInfo.details?.data?.title} | Karma GAP`,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `Impact of ${projectInfo.details?.data?.title} | Karma GAP`,
      description: cleanMarkdownForPlainText(
        projectInfo.details?.data?.description || "",
        80
      ),
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: `Impact of ${projectInfo.details?.data?.title} | Karma GAP`,
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
