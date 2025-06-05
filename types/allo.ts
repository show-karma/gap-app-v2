import type { Address } from "viem";
import type { StrategyType } from "@/utilities/allo/config";
import type { TokenInfo } from "@/utilities/allo/tokens";

// Pool information
export interface PoolInfo {
  poolId: string;
  chainId: number;
  totalAmount: bigint;
  availableAmount: bigint;
  token: TokenInfo;
  strategy: {
    address: Address;
    type: string;
    name: string;
  };
  approvedApplications: ApprovedApplication[];
  totalApprovedCount: number;
}

// Application data
export interface ApprovedApplication {
  recipientId: string;
  recipientAddress: Address;
  profileId?: string;
  applicationData: any;
  status: "approved";
}

// CSV data structures
export interface CSVRow {
  address: string;
  amount: string;
  profileId?: string;
}

export interface ValidatedCSVRow extends CSVRow {
  parsedAmount: bigint;
  checksummedAddress: Address;
}

// Validation results
export interface ValidationResult {
  validRows: ValidatedCSVRow[];
  errors: Array<{
    row: number;
    error: string;
  }>;
  totalRows: number;
}

// Pool query result from Allo contract
export interface PoolData {
  profileId: string;
  strategy: Address;
  token: Address;
  metadata: {
    protocol: bigint;
    pointer: string;
  };
  managerRole: string;
  adminRole: string;
}

// Distribution transaction status
export type DistributionStatus = "idle" | "preparing" | "pending" | "success" | "error";

export interface DistributionResult {
  status: DistributionStatus;
  transactionHash?: string;
  error?: string;
  recipients: number;
  totalAmount: string;
} 