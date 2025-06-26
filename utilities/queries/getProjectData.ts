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
    let response:
      | Awaited<ReturnType<typeof gapIndexerApi.projectBySlug>>
      | undefined;
    try {
      response = await gapIndexerApi.projectBySlug(projectId);
    } catch (error) {
      notFound();
    }

    const project = response?.data;

    if (!project || project.uid === zeroUID || !response?.data) {
      notFound();
    }

    if (
      shouldRedirect &&
      project?.pointers?.length &&
      project.pointers[0]?.data?.ogProjectUID &&
      project.pointers[0].data.ogProjectUID !== project.uid
    ) {
      const original = await gapIndexerApi
        .projectBySlug(project.pointers[0].data.ogProjectUID)
        .then((res) => res.data)
        .catch(() => null);

      const originalSlug = original?.details?.data?.slug;

      if (original && originalSlug && originalSlug !== projectId) {
        redirect(`/project/${originalSlug}`);
      }
    }

    return project;
  }
);
