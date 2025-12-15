import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getProject } from "@/services/project.service";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { zeroUID } from "@/utilities/commons";
import { PAGES } from "../pages";

export const getProjectCachedData = cache(async (projectId: string): Promise<ProjectResponse> => {
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
    if (original && original?.details.slug && original?.details.slug !== projectId) {
      redirect(PAGES.PROJECT.OVERVIEW(original?.details.slug as string));
    }
  }

  return project;
});
