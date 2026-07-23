import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for POST operations
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Contract API Error:", error.response?.data || error.message);

    // Extract the API error message if available, otherwise use a user-friendly message
    const apiErrorMessage = error.response?.data?.message;
    if (apiErrorMessage) {
      // Create a new error with the API message
      const enhancedError = new Error(apiErrorMessage);
      (enhancedError as Error & { originalError?: unknown }).originalError = error;
      throw enhancedError;
    }

    throw error;
  }
);

/**
 * Deployer information for a contract
 */
export interface DeployerInfo {
  deployerAddress: string;
  createdAt: string;
  txHash: string;
}

/**
 * Verification message from backend
 */
export interface VerificationMessage {
  message: string;
  nonce: string;
  expiresAt: string;
  deployerAddress: string;
}

/**
 * Verification result after signature validation
 */
export interface VerificationResult {
  verified: boolean;
  contract: {
    network: string;
    address: string;
    verifiedAt: string;
    verifiedBy: string;
  };
}

/**
 * Parameters for signature verification
 */
export interface VerifySignatureParams {
  network: string;
  contractAddress: string;
  signature: string;
  nonce: string;
  projectUid: string;
}

/**
 * Contract address validation response
 */
export interface ContractValidationResponse {
  isValid: boolean;
  exists?: boolean;
  message?: string;
}

/**
 * Service for handling contract-related operations
 */
export class ContractsService {
  /**
   * Look up the deployer address of a contract
   * @param network - The blockchain network
   * @param contractAddress - The contract address
   * @returns Deployer information
   */
  async lookupDeployer(network: string, contractAddress: string): Promise<DeployerInfo> {
    let data: DeployerInfo | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<DeployerInfo>(
        INDEXER.PROJECT.CONTRACTS.DEPLOYER(network, contractAddress)
      );
    } catch (error) {
      console.error("Contract API Error:", error);
      throw new Error(httpErrorMessage(error) || "Failed to lookup deployer");
    }

    if (!data) {
      console.error("Contract API Error:", "empty response");
      throw new Error("Failed to lookup deployer");
    }

    return data;
  }

  /**
   * Request a verification message from the backend
   * Backend will validate the deployer and generate a message to sign
   * @param network - The blockchain network
   * @param contractAddress - The contract address
   * @param userAddress - The user's wallet address
   * @returns Verification message to sign
   */
  async requestVerificationMessage(
    network: string,
    contractAddress: string,
    userAddress: string
  ): Promise<VerificationMessage> {
    const response = await apiClient.post<VerificationMessage>(
      INDEXER.PROJECT.CONTRACTS.VERIFY_MESSAGE(),
      { network, contractAddress, userAddress }
    );

    return response.data;
  }

  /**
   * Verify a signed message to prove contract ownership
   * @param params - Verification parameters including signature and nonce
   * @returns Verification result
   */
  async verifyContractSignature(params: VerifySignatureParams): Promise<VerificationResult> {
    const response = await apiClient.post<VerificationResult>(
      INDEXER.PROJECT.CONTRACTS.VERIFY_SIGNATURE(),
      params
    );

    return response.data;
  }

  /**
   * Check if a contract address is available for a project
   * @param address - The contract address
   * @param network - The blockchain network
   * @param excludeProjectId - Optional project ID to exclude from validation
   * @returns Validation result
   */
  async checkAddressAvailability(
    address: string,
    network: string,
    excludeProjectId?: string
  ): Promise<ContractValidationResponse> {
    const response = await apiClient.post<ContractValidationResponse>(
      INDEXER.PROJECT.CONTRACTS.CHECK_ADDRESS(),
      {
        address,
        network,
        excludeProjectId,
      }
    );

    return response.data;
  }
}

// Export singleton instance
export const contractsService = new ContractsService();

// Export individual functions for convenience
export const lookupDeployer = (network: string, contractAddress: string) =>
  contractsService.lookupDeployer(network, contractAddress);

export const requestVerificationMessage = (
  network: string,
  contractAddress: string,
  userAddress: string
) => contractsService.requestVerificationMessage(network, contractAddress, userAddress);

export const verifyContractSignature = (params: VerifySignatureParams) =>
  contractsService.verifyContractSignature(params);

export const checkAddressAvailability = (
  address: string,
  network: string,
  excludeProjectId?: string
) => contractsService.checkAddressAvailability(address, network, excludeProjectId);
