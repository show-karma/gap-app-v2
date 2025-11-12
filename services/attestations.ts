import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import type { Address } from "viem";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

interface AttestationResponse {
  uid: string;
  attester: Address;
  chainID?: number;
  [key: string]: unknown;
}

/**
 * Fetch attestation from backend database by UID
 * @param uid - Attestation UID
 * @param chainId - Optional chain ID to filter by
 * @returns Attestation object with attester field, or null if not found
 */
export async function getAttestation(
  uid: string,
  chainId?: number
): Promise<{ attester: Address } | null> {
  try {
    const response = await apiClient.get<AttestationResponse>(
      INDEXER.ATTESTATIONS.GET(uid, chainId)
    );

    if (!response.data?.attester) {
      return null;
    }

    return {
      attester: response.data.attester as Address,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
