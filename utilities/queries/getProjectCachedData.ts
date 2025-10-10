import { zeroUID } from "@/utilities/commons";
import { notFound, redirect } from "next/navigation";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cache } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getProjectData } from "../api/project";

export const getProjectCachedData = cache(
  async (projectId: string): Promise<IProjectResponse> => {
    let project: IProjectResponse | undefined;
    
    try {
      const projectData = await getProjectData(projectId, {
        cache: "reload",
        next: { revalidate: 60 },
      });

      project = projectData;
    } catch (error) {
      notFound();
    }

    if (!project || project.uid === zeroUID) {
      notFound();
    }

    const isUid = /^0x[0-9a-fA-F]{64}$/.test(projectId);
    const canonicalSlug = project?.details?.data?.slug;

    if (!isUid && canonicalSlug && canonicalSlug.toLowerCase() !== projectId.toLowerCase()) {
      redirect(`/project/${canonicalSlug}`);
    }

    if (
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
