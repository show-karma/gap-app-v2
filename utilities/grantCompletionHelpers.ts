import { getProjectGrants } from "@/services/project-grants.service";
import { retryUntilConditionMet } from "@/utilities/retries";

/**
 * Factory function to create a check function for grant completion existence.
 * Uses direct service calls for polling to check indexer sync status.
 */
export const createCheckIfCompletionExists = (grantUID: string, projectIdOrSlug: string) => {
  return async (callbackFn?: () => void) => {
    await retryUntilConditionMet(
      async () => {
        const fetchedGrants = await getProjectGrants(projectIdOrSlug);
        if (!fetchedGrants.length) {
          return true;
        }
        const foundGrant = fetchedGrants.find((g) => g.uid === grantUID);
        return !foundGrant?.completed;
      },
      () => {
        callbackFn?.();
      }
    );
  };
};

/**
 * Validate grant completion before revocation
 */
export const validateGrantCompletion = (
  completed:
    | {
        schema?: { revocable?: boolean } | null;
        revoked?: boolean | null;
      }
    | null
    | undefined
) => {
  if (!completed) {
    throw new Error("Grant completion not found");
  }

  // Verify revocable status
  if (completed.schema?.revocable !== true) {
    throw new Error("Grant completion is not revocable");
  }

  // Verify not already revoked
  if (completed.revoked === true) {
    throw new Error("Grant completion already revoked");
  }
};

/**
 * Build revocation payload for on-chain revocation
 * Matches the multiRevoke ABI structure:
 * - schema: bytes32 (schema UID)
 * - data: Array<{ uid: bytes32, value: uint256 }>
 */
export const buildRevocationPayload = (
  schemaUID: string,
  attestationUID: string,
  value: bigint = 0n
): Array<{
  schema: `0x${string}`;
  data: Array<{
    uid: `0x${string}`;
    value: bigint;
  }>;
}> => {
  return [
    {
      schema: schemaUID as `0x${string}`,
      data: [
        {
          uid: attestationUID as `0x${string}`,
          value,
        },
      ],
    },
  ];
};
