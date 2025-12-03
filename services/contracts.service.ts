import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Contract API Error:", error.response?.data || error.message);
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
    const response = await apiClient.get<DeployerInfo>(`/v2/projects/contracts/deployer`, {
      params: { network, contractAddress },
    });

    return response.data;
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
      `/v2/projects/contracts/verify-message`,
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
      `/v2/projects/contracts/verify-signature`,
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
      `/v2/projects/contracts/address-availability`,
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
