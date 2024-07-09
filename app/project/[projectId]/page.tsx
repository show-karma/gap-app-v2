/* eslint-disable @next/next/no-img-element */
import ProjectPage from "./project/page";
import { IProjectDetails, Project } from "@show-karma/karma-gap-sdk";
import {
  fetchMetadata,
  metadataToMetaTags,
} from "frames.js/next/pages-router/client";
import { envVars } from "@/utilities/enviromentVars";
import { Hex } from "viem";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { notFound } from "next/navigation";

type ProjectDetailsWithUid = IProjectDetails & { uid: Hex };

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;
  let projectInfo: ProjectDetailsWithUid | null = null;

  await Promise.all(
    [
      async () => {
        const info = await getMetadata<IProjectDetails>(
          "projects",
          projectId as Hex
        );
        projectInfo = info as ProjectDetailsWithUid;
      },
    ].map((func) => func())
  );

  if (!projectInfo || (projectInfo as ProjectDetailsWithUid)?.uid === zeroUID) {
    notFound();
  }

  const dynamicMetadata = {
    title: `Karma GAP - ${(projectInfo as ProjectDetailsWithUid).title}`,
    description:
      (projectInfo as ProjectDetailsWithUid).description?.substring(0, 80) ||
      "",
  };

  const framesAdditionalMetatags = Object.entries(
    await fetchMetadata(
      new URL(
        `/api/frames/${projectId}?projectInfo=${
          // Base64 encoded projectInfo
          encodeURIComponent(
            Buffer.from(JSON.stringify(projectInfo)).toString("base64")
          )
        }`,
        envVars.VERCEL_URL
      )
    )
  ).map(([key, value]) => ({
    name: key,
    content: String(value),
  }));

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      handle: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      cardType: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: dynamicMetadata.title || defaultMetadata.title,
      })),
    },
    additionalLinkTags: [
      {
        rel: "icon",
        href: "/images/favicon.png",
      },
    ],
    additionalMetaTags: framesAdditionalMetatags,
  };
}

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
