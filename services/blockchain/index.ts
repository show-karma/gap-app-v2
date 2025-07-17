// Blockchain Services Entry Point

// Providers
export { config, getWagmiConfig } from "./providers/wagmi-config";
export { rpcClient, getRPCClient } from "./providers/rpc-client";

// Utils
export {
  publicClientToProvider,
  walletClientToSigner,
  useSigner,
  useProvider,
} from "./utils/eas-wagmi-utils";

// Contracts
export { getContractOwner } from "./contracts/multicall";

// Types
export type {
  TransactionResult,
  ContractCall,
  NetworkConfig,
  Web3Provider,
  Web3Signer,
  BlockchainError,
} from "./types";