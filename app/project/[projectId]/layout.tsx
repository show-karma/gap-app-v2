/* eslint-disable @next/next/no-img-element */
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import { zeroUID } from "@/utilities/commons";
import { notFound, redirect } from "next/navigation";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";

const getProjectData = cache(
  async (projectId: string): Promise<IProjectResponse> => {
    try {
      const response = await gapIndexerApi.projectBySlug(projectId);
      const project = response.data;

      if (!project || project.uid === zeroUID) {
        notFound();
      }

      if (project?.pointers && project?.pointers?.length > 0) {
        const original = await gapIndexerApi
          .projectBySlug(project.pointers[0].data?.ogProjectUID)
          .then((res) => res.data)
          .catch(() => null);
        if (original) {
          redirect(`/project/${original.details?.data?.slug}`);
        }
      }

      return project;
    } catch (error) {
      notFound();
    }
  }
);

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;
  const projectInfo = await getProjectData(projectId);

  return generateProjectOverviewMetadata(projectInfo, projectId);
}

export default async function RootLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      return await getProjectData(projectId);
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-0">
        <ProjectWrapper projectId={projectId} />
        <div className="px-4 sm:px-6 lg:px-12">{children}</div>
      </div>
    </HydrationBoundary>
  );
}
