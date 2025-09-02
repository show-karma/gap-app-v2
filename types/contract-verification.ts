export interface ContractVerificationStatus {
  address: string;
  verified: boolean;
  verifiedAt?: string;
  deployerAddress?: string;
}

export interface ContractVerificationResponse {
  contracts: ContractVerificationStatus[];
}

export interface VerifyContractRequest {
  contractAddress: string;
  chainId: number;
  signature: string;
}

export interface VerifyContractResponse {
  verified: boolean;
  contractAddress: string;
  error?: string;
}

export interface NetworkAddressPair {
  network: string;
  address: string;
  verified?: boolean;
  verifiedAt?: string;
}