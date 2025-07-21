"use server";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import {
  IProjectResponse,
  IGrantResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/services/gap-indexer/gap-indexer";
import { getProjectData } from "@/features/projects/api/project";
import { zeroUID } from "@/lib/utils/misc";
import { getAllMilestones as getAllMilestonesUtil } from "@/features/milestones/api/getAllMilestones";
import {
  subscribeToProject,
  updateProjectCategories,
  requestProjectIntro,
  revokeAttestation,
} from "./api";

/**
 * Server action to fetch project data with caching
 */
export const getProjectAction = cache(
  async (
    projectId: string,
    shouldRedirect = true
  ): Promise<IProjectResponse> => {
    let project: IProjectResponse | undefined;
    try {
      const projectData = await getProjectData(projectId, {
        cache: "no-store", // Always fetch fresh
        next: { revalidate: 60 }, // Cache for 1 minute
      });

      project = projectData;
    } catch (error) {
      notFound();
    }

    if (!project || project.uid === zeroUID) {
      notFound();
    }

    // Handle project redirects for merged/migrated projects
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

/**
 * Server action to get all milestones aggregated across grants
 */
export async function getAllMilestonesAction(
  projectId: string,
  grants: IGrantResponse[]
) {
  return getAllMilestonesUtil(projectId, grants);
}

/**
 * Server action to subscribe to a project
 */
export async function subscribeToProjectAction(projectId: string) {
  try {
    await subscribeToProject(projectId as `0x${string}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to subscribe",
    };
  }
}

/**
 * Server action to update project categories
 */
export async function updateProjectCategoriesAction(
  projectId: string,
  categories: string[]
) {
  try {
    await updateProjectCategories(projectId, categories);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update categories",
    };
  }
}

/**
 * Server action to request project introduction
 */
export async function requestProjectIntroAction(
  projectIdOrSlug: string,
  introData: {
    name: string;
    email: string;
    message: string;
  }
) {
  try {
    await requestProjectIntro(projectIdOrSlug, introData);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send intro request",
    };
  }
}

/**
 * Server action to revoke an attestation
 */
export async function revokeAttestationAction(
  attestationUID: string,
  chainId: number
) {
  try {
    await revokeAttestation(attestationUID as `0x${string}`, chainId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke attestation",
    };
  }
}

// Note: createProject, updateProject, and deleteProject actions would require
// additional implementation as they involve blockchain transactions and would
// need to be carefully designed to work as server actions while maintaining
// the client-side wallet interaction requirements.
