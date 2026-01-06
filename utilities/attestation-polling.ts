import type { GAP } from "@show-karma/karma-gap-sdk";
import type { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getProjectGrants } from "@/services/project-grants.service";
import { retryUntilConditionMet } from "@/utilities/retries";

interface PollForGrantCompletionParams {
  gapClient: GAP;
  projectUid: string;
  grantUid: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Poll until grant is marked as completed
 * Reusable for any grant completion workflow
 *
 * @param params - Polling parameters
 * @throws Error if polling times out or encounters errors
 *
 * @example
 * ```typescript
 * await pollForGrantCompletion({
 *   gapClient,
 *   projectUid: project.uid,
 *   grantUid: grant.uid,
 * });
 * // Grant is now confirmed as completed
 * ```
 */
export const pollForGrantCompletion = async ({
  gapClient,
  projectUid,
  grantUid,
  maxRetries = 5,
  retryDelayMs = 1000,
}: PollForGrantCompletionParams): Promise<void> => {
  await retryUntilConditionMet(
    async () => {
      const grants = await getProjectGrants(projectUid);

      const completedGrant = grants?.find((g) => g.uid.toLowerCase() === grantUid.toLowerCase());

      return !!completedGrant?.completed;
    },
    undefined,
    maxRetries,
    retryDelayMs
  );
};

interface PollForMilestoneStatusParams {
  gapClient: GAP;
  projectUid: string;
  programId: string;
  milestoneUid: string;
  checkCompletion: boolean;
  userAddress: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Poll until milestone completion/verification is indexed
 * Reusable for milestone verification workflow
 *
 * @param params - Polling parameters
 * @throws Error if polling times out or encounters errors
 *
 * @example
 * ```typescript
 * // Poll for verification only
 * await pollForMilestoneStatus({
 *   gapClient,
 *   projectUid,
 *   programId,
 *   milestoneUid,
 *   checkCompletion: false,
 *   userAddress: address,
 * });
 *
 * // Poll for both completion and verification
 * await pollForMilestoneStatus({
 *   gapClient,
 *   projectUid,
 *   programId,
 *   milestoneUid,
 *   checkCompletion: true,
 *   userAddress: address,
 * });
 * ```
 */
export const pollForMilestoneStatus = async ({
  gapClient,
  projectUid,
  programId,
  milestoneUid,
  checkCompletion,
  userAddress,
  maxRetries = 5,
  retryDelayMs = 1000,
}: PollForMilestoneStatusParams): Promise<void> => {
  await retryUntilConditionMet(
    async () => {
      const grants = await getProjectGrants(projectUid);
      const updatedGrant = grants.find((g) => g.details?.programId === programId);
      if (!updatedGrant) return false;

      const updatedMilestone = updatedGrant.milestones?.find((m) => m.uid === milestoneUid);
      if (!updatedMilestone) return false;

      // If checking completion, ensure both completion and verification from specific user
      if (checkCompletion) {
        const isCompleted = updatedMilestone.completed;
        const isVerified = updatedMilestone.verified?.find(
          (v) => v.attester?.toLowerCase() === userAddress.toLowerCase()
        );
        return !!(isCompleted && isVerified);
      }

      // When only checking verification, check if ANY verification exists (regardless of user)
      return !!(updatedMilestone.verified && updatedMilestone.verified.length > 0);
    },
    undefined,
    maxRetries,
    retryDelayMs
  );
};
