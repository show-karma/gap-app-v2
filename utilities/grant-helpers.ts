import type { GAP } from "@show-karma/karma-gap-sdk";
import type { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getProjectData } from "@/services/project.service";

interface FetchGrantInstanceParams {
  gapClient: GAP;
  projectUid: string;
  grantUid: string;
}

/**
 * Fetch project and find grant instance by UID
 * Reusable for any grant operation
 *
 * @param params - Parameters for fetching grant instance
 * @returns Grant instance from the SDK
 * @throws Error if project or grant not found
 *
 * @example
 * ```typescript
 * const grantInstance = await fetchGrantInstance({
 *   gapClient,
 *   projectUid: project.uid,
 *   grantUid: grant.uid,
 * });
 *
 * // Use grantInstance for attestations
 * await grantInstance.complete(walletSigner, data, changeStepperStep);
 * ```
 */
export const fetchGrantInstance = async ({
  gapClient,
  projectUid,
  grantUid,
}: FetchGrantInstanceParams) => {
  const fetchedProject = await getProjectData(projectUid);

  if (!fetchedProject) {
    throw new Error(
      "Failed to fetch project data. The project may have been deleted or you may not have permission to access it."
    );
  }

  const grantInstance = fetchedProject.grants?.find(
    (g) => g.uid.toLowerCase() === grantUid.toLowerCase()
  );

  if (!grantInstance) {
    throw new Error("Grant not found in project. Please refresh the page and try again.");
  }

  return grantInstance;
};

/**
 * Get SDK Grant class instance for attestation operations
 * This is needed because V2 data types don't have attestation methods
 */
export const getSDKGrantInstance = async ({
  gapClient,
  projectUid,
  grantUid,
}: FetchGrantInstanceParams) => {
  const fetchedProject = await gapClient.fetch.projectById(projectUid);

  if (!fetchedProject) {
    throw new Error("Failed to fetch project from SDK");
  }

  const grantInstance = fetchedProject.grants?.find(
    (g) => g.uid.toLowerCase() === grantUid.toLowerCase()
  );

  if (!grantInstance) {
    throw new Error("Grant not found in SDK project");
  }

  return grantInstance;
};

interface FetchMilestoneInstanceParams {
  gapClient: GAP;
  projectUid: string;
  programId: string;
  milestoneUid: string;
}

/**
 * Fetch project and find milestone instance by UID
 * Reusable for milestone operations
 *
 * @param params - Parameters for fetching milestone instance
 * @returns Object containing milestone instance, community UID, and grant instance
 * @throws Error if project, grant, or milestone not found
 *
 * @example
 * ```typescript
 * const { milestoneInstance, communityUID, grantInstance } = await fetchMilestoneInstance({
 *   gapClient,
 *   projectUid,
 *   programId,
 *   milestoneUid: milestone.uid,
 * });
 *
 * // Use milestoneInstance for attestations
 * const isCompleted = milestoneInstance.completed;
 * ```
 */
export const fetchMilestoneInstance = async ({
  gapClient,
  projectUid,
  programId,
  milestoneUid,
}: FetchMilestoneInstanceParams) => {
  const fetchedProject = await getProjectData(projectUid);
  if (!fetchedProject) {
    throw new Error("Failed to fetch project data");
  }

  const grantInstance = fetchedProject.grants?.find((g: any) => g.details?.programId === programId);

  if (!grantInstance) {
    throw new Error("Grant not found");
  }

  const milestoneInstance = grantInstance.milestones?.find(
    (m) => m.uid.toLowerCase() === milestoneUid.toLowerCase()
  );

  if (!milestoneInstance) {
    throw new Error("Milestone not found");
  }

  // Extract communityUID from grant data
  const communityUID = grantInstance.data?.communityUID || "";

  return {
    milestoneInstance,
    communityUID,
    grantInstance,
  };
};
