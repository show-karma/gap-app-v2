import { ObjectiveFilter } from "@/components/Pages/Project/Objective/Filter";
import { ObjectiveList } from "@/components/Pages/Project/Objective/List";
import { ObjectivesSub } from "@/components/Pages/Project/Objective/ObjectivesSub";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { formatDate } from "@/utilities/formatDate";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { getProjectObjectives } from "@/utilities/gapIndexerApi/getProjectObjectives";
import { defaultMetadata } from "@/utilities/meta";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import pluralize from "pluralize";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;

  const projectInfo = await gapIndexerApi
    .projectBySlug(projectId)
    .then((res) => res.data)
    .catch(() => notFound());

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }
  let metadata = {
    title: defaultMetadata.title,
    description: defaultMetadata.description,
    twitter: defaultMetadata.twitter,
    openGraph: defaultMetadata.openGraph,
    icons: defaultMetadata.icons,
  };

  metadata = {
    ...metadata,
    title: `${projectInfo?.details?.data?.title} Roadmap | Karma GAP`,
    description: `Explore the detailed roadmap of ${projectInfo?.details?.data?.title} on Karma GAP, outlining key milestones, deliverables, and progress updates. Stay informed about the project's journey and future plans, providing transparency for funders and stakeholders.`,
  };

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
      // site_name: defaultMetadata.openGraph.siteName,
    },
    icons: metadata.icons,
  };
}

export default async function RoadmapPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await gapIndexerApi
    .projectBySlug(params.projectId)
    .then((res) => res.data)
    .catch(() => notFound());

  if (project?.uid === zeroUID || !project) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-start">
      <div className="flex flex-col gap-2 py-11 items-center justify-start w-full max-w-6xl">
        <div className="py-5 w-full items-center flex flex-row justify-between gap-4">
          <div className="flex flex-col gap-1 items-start justify-start">
            <h3 className="text-2xl font-bold text-black dark:text-zinc-200">
              {project.details?.data?.title} Roadmap
            </h3>
            <Suspense fallback={<Skeleton className="w-full h-full" />}>
              <ObjectivesSub />
            </Suspense>
          </div>
          <ObjectiveFilter />
        </div>
        <div className="py-6 w-full">
          <ObjectiveList />
        </div>
      </div>
    </div>
  );
}
