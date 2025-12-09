import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getProjectData } from "@/services/project.service";
import type { ProjectResponse } from "@/types/v2/project";
import { zeroUID } from "@/utilities/commons";

export const getProjectCachedData = cache(async (projectId: string): Promise<ProjectResponse> => {
  let project: ProjectResponse | undefined;

  try {
    // React cache() provides request-level memoization
    // Page-level revalidation should be configured via route segment config
    const projectData = await getProjectData(projectId);
    project = projectData;
  } catch (_error) {
    notFound();
  }

  if (!project || project.uid === zeroUID) {
    notFound();
  }

  const isUid = /^0x[0-9a-fA-F]{64}$/.test(projectId);
  const canonicalSlug = project?.details?.slug;

  if (!isUid && canonicalSlug && canonicalSlug.toLowerCase() !== projectId.toLowerCase()) {
    redirect(`/project/${canonicalSlug}`);
  }

  return project;
});
