import { zeroUID } from "@/utilities/commons";
import { notFound, redirect } from "next/navigation";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cache } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "@/config/env";
import { getProjectData } from "../api/project";

export const getProjectCachedData = cache(
  async (
    projectId: string,
    shouldRedirect = true
  ): Promise<IProjectResponse> => {
    let project: IProjectResponse | undefined;
    try {
      const projectData = await getProjectData(projectId, {
        cache: "reload", // Always fetch fresh
        next: { revalidate: 60 }, // Cache for 5 minutes
      });

      project = projectData;
    } catch (error) {
      notFound();
    }

    if (!project || project.uid === zeroUID) {
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
