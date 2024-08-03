/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Metadata } from "next";
import { Hex } from "viem";
import { IProjectDetails } from "@show-karma/karma-gap-sdk";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { ImpactComponent } from "@/components/Pages/Project/Impact";
import { notFound } from "next/navigation";

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
    notFound();
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
      icon: "/favicon.ico",
    },
  };
}

const ImpactPage = () => {
  return (
    <div className="pt-5 pb-20">
      <ImpactComponent />
    </div>
  );
};

export default ImpactPage;
