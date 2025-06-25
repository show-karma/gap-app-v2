import { zeroUID } from "@/utilities/commons";
import { notFound, redirect } from "next/navigation";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cache } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export const getProjectData = cache(
  async (
    projectId: string,
    shouldRedirect = true
  ): Promise<IProjectResponse> => {
    const response = await gapIndexerApi.projectBySlug(projectId);
    const project = response?.data;

    if (!project || project.uid === zeroUID || !response?.data) {
      notFound();
    }

    if (shouldRedirect) {
      if (project?.pointers && project?.pointers?.length > 0) {
        const original = await gapIndexerApi
          .projectBySlug(project.pointers[0].data?.ogProjectUID)
          .then((res) => res.data)
          .catch(() => null);
        if (original) {
          redirect(`/project/${original.details?.data?.slug}`);
        }
      }
    }

    return project;
  }
);
