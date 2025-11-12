import type { Address } from "viem";
import type { Signer } from "ethers";
import { retryUntilConditionMet } from "@/utilities/retries";
import type {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

/**
 * Factory function to create a check function for grant completion existence
 */
export const createCheckIfCompletionExists = (
  grantUID: string,
  refreshProject: () => Promise<IProjectResponse | null | undefined>
) => {
  return async (callbackFn?: () => void) => {
    await retryUntilConditionMet(
      async () => {
        const fetchedProject = await refreshProject();
        // If project doesn't exist or has no grants, consider completion as removed
        if (!fetchedProject || !fetchedProject.grants) {
          return true;
        }
        const foundGrant = fetchedProject.grants.find(
          (g) => g.uid === grantUID
        );
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
 * Get signer address from wallet signer or fallback to address
 */
export const getSignerAddress = async (
  walletSigner: Signer | null | undefined,
  address: Address | undefined
): Promise<Address> => {
  if (walletSigner && typeof walletSigner.getAddress === "function") {
    return (await walletSigner.getAddress()) as Address;
  } else if (address) {
    return address;
  } else {
    throw new Error("Unable to get signer address");
  }
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
 */
export const buildRevocationPayload = (
  schemaUID: string,
  attestationUID: string
): Array<{ schemaId: `0x${string}`; uid: `0x${string}` }> => {
  if (!schemaUID) {
    throw new Error("Grant completion schema UID not found");
  }

  return [
    {
      schemaId: schemaUID as `0x${string}`,
      uid: attestationUID as `0x${string}`,
    },
  ];
};
