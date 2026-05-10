import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getProject } from "@/services/project.service";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "../pages";

const PROJECT_UID_REGEX = /^0x[0-9a-fA-F]{64}$/;
const PROJECT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const isValidProjectRouteParam = (projectId: string): boolean => {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    return false;
  }

  return (
    PROJECT_UID_REGEX.test(normalizedProjectId) || PROJECT_SLUG_REGEX.test(normalizedProjectId)
  );
};

export const getProjectCachedData = cache(async (projectId: string): Promise<ProjectResponse> => {
  if (!isValidProjectRouteParam(projectId)) {
    notFound();
  }

  const project = await getProject(projectId);

  if (!project || project.uid === zeroUID) {
    notFound();
  }

  const isUid = /^0x[0-9a-fA-F]{64}$/.test(projectId);
  const canonicalSlug = project?.details?.slug;

  if (!isUid && canonicalSlug && canonicalSlug.toLowerCase() !== projectId.toLowerCase()) {
    redirect(`/project/${canonicalSlug}`);
  }

  if (
    project?.pointers?.length &&
    project.pointers[0]?.originalProjectUID &&
    project.pointers[0].originalProjectUID !== project.uid
  ) {
    const original = await getProject(project.pointers[0].originalProjectUID);
    if (original?.details?.slug && original.details.slug !== projectId) {
      redirect(PAGES.PROJECT.OVERVIEW(original.details.slug));
    }
  }

  return project;
});
