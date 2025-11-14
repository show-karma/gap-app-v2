import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface NotifyIndexerParams {
  txHash: string | undefined;
  chainId: number;
  invalidateQueries?: () => Promise<void>;
}

/**
 * Notify indexer about new attestation and optionally invalidate queries
 * Base function for all attestation indexing needs
 *
 * @param params - Notification parameters
 *
 * @example
 * ```typescript
 * await notifyIndexer({
 *   txHash: result.tx[0].hash,
 *   chainId: grant.chainID,
 *   invalidateQueries: async () => {
 *     await queryClient.invalidateQueries({ queryKey: ["myQuery"] });
 *   },
 * });
 * ```
 */
export const notifyIndexer = async ({
  txHash,
  chainId,
  invalidateQueries,
}: NotifyIndexerParams): Promise<void> => {
  if (txHash) {
    await fetchData(
      INDEXER.ATTESTATION_LISTENER(txHash, chainId),
      "POST",
      {}
    );
  }

  // Optional: caller can provide custom cache invalidation
  if (invalidateQueries) {
    await invalidateQueries();
  }
};

/**
 * Notify indexer and invalidate grant-related queries
 * Specialized function for grant completion workflows
 *
 * @param txHash - Transaction hash from grant completion
 * @param chainId - Chain ID where attestation was created
 * @param projectUid - Project UID for cache invalidation
 * @param programId - Optional program ID for milestone cache invalidation
 *
 * @example
 * ```typescript
 * const txHash = result?.tx[0]?.hash;
 * await notifyIndexerForGrant(txHash, grant.chainID, project.uid);
 * ```
 */
export const notifyIndexerForGrant = async (
  txHash: string | undefined,
  chainId: number,
  projectUid: string,
  programId?: string
): Promise<void> => {
  await notifyIndexer({
    txHash,
    chainId,
    invalidateQueries: async () => {
      // Invalidate project queries
      await queryClient.invalidateQueries({
        queryKey: ["project", projectUid],
      });

      // Invalidate grant milestones if programId provided
      if (programId) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(
            projectUid,
            programId
          ),
        });
      }
    },
  });
};

/**
 * Notify indexer and invalidate milestone-related queries
 * Specialized function for milestone verification workflows
 *
 * @param txHash - Transaction hash from milestone verification
 * @param chainId - Chain ID where attestation was created
 * @param projectUid - Project UID for cache invalidation
 * @param programId - Program ID for milestone queries
 * @param communityUID - Optional community UID for report invalidation
 *
 * @example
 * ```typescript
 * const txHash = result?.tx[0]?.hash;
 * await notifyIndexerForMilestone(
 *   txHash,
 *   milestone.chainId,
 *   projectUid,
 *   programId,
 *   communityUID
 * );
 * ```
 */
export const notifyIndexerForMilestone = async (
  txHash: string | undefined,
  chainId: number,
  projectUid: string,
  programId: string,
  communityUID?: string
): Promise<void> => {
  await notifyIndexer({
    txHash,
    chainId,
    invalidateQueries: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(
          projectUid,
          programId
        ),
      });

      if (communityUID) {
        await queryClient.invalidateQueries({
          queryKey: ["reportMilestones", communityUID],
        });
      }
    },
  });
};
