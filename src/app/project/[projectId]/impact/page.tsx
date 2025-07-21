/* eslint-disable @next/next/no-img-element */
import { zeroUID } from "@/lib/utils/misc";
import { envVars } from "@/config/env";
import { cleanMarkdownForPlainText } from "@/lib/markdown";
import { defaultMetadata } from "@/lib/metadata/meta";
import { getMetadata } from "@/services/meta/getMetadata";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hex } from "viem";
import ImpactWrapper from "@/features/projects/components/impact/ImpactWrapper";

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
