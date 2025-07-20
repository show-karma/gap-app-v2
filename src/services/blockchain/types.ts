import type { Address, Chain, Hash, Hex } from "viem";
import type { JsonRpcProvider, JsonRpcSigner } from "ethers";

export interface TransactionResult {
  hash: Hash;
  chainId: number;
  blockNumber?: number;
  status?: "success" | "reverted";
}

export interface ContractCall {
  address: Address;
  abi: any[];
  functionName: string;
  args?: any[];
  value?: bigint;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
  contracts: {
    [key: string]: Address;
  };
}

export type Web3Provider = JsonRpcProvider;
export type Web3Signer = JsonRpcSigner;

export interface BlockchainError {
  code: string | number;
  message: string;
  data?: any;
}