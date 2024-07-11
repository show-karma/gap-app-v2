/* eslint-disable @next/next/no-img-element */
import React from "react";

import { Hex } from "viem";
import { Metadata } from "next";
import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      title: "Not Found",
      description: "Project not found",
    };
  }

  return {
    title: `Karma GAP - ${projectInfo.title}`,
    description: projectInfo.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `Karma GAP - ${projectInfo.title}`,
      description: projectInfo.description?.substring(0, 80) || "",
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: `Karma GAP - ${projectInfo.title}`,
      })),
    },
    icons: {
      icon: "/images/favicon.png",
    },
  };
}

function Page() {
  return <ContactInfoPage />;
}

export default Page;
