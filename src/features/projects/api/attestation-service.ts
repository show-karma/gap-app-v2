import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/utilities/indexer";
import { Hex } from "viem";

/**
 * Notifies the indexer about a new attestation to index
 * @param txHashOrUID - The transaction hash or attestation UID
 * @param chainId - The chain ID where the attestation was created
 * @returns Promise<boolean> - Returns true if successful
 */
export const notifyAttestationCreated = async (
  txHashOrUID: Hex | string,
  chainId: number
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.ATTESTATION_LISTENER(txHashOrUID, chainId),
    "POST"
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Revokes an attestation
 * @param attestationUID - The attestation UID to revoke
 * @param chainId - The chain ID
 * @returns Promise<boolean> - Returns true if successful
 */
export const revokeAttestation = async (
  attestationUID: string | `0x${string}`,
  chainId: number
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.REVOKE_ATTESTATION(attestationUID, chainId),
    "POST"
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};
