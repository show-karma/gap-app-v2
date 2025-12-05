import type { ProjectResponse } from "@/types/v2/project";
import { retryUntilConditionMet } from "@/utilities/retries";

/**
 * Factory function to create a check function for grant completion existence
 */
export const createCheckIfCompletionExists = (
  grantUID: string,
  refreshProject: () => Promise<ProjectResponse | null | undefined>
) => {
  return async (callbackFn?: () => void) => {
    await retryUntilConditionMet(
      async () => {
        const fetchedProject = await refreshProject();
        // If project doesn't exist or has no grants, consider completion as removed
        if (!fetchedProject || !fetchedProject.grants) {
          return true;
        }
        const foundGrant = fetchedProject.grants.find((g) => g.uid === grantUID);
        // If grant doesn't exist, consider completion as removed
        // Otherwise check if completion exists
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
