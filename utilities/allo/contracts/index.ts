import { getContract, type PublicClient, type WalletClient, type Address } from "viem";
import { getRPCClient } from "@/utilities/rpcClient";
import { getChainNameById } from "@/utilities/network";
import { ALLO_CONTRACT_ADDRESSES, STRATEGY_TYPES, STRATEGY_CAPABILITIES } from "../config";
import { getStrategyInfo, getStrategyName } from "../strategyRegistry"; 
import AlloABI from "./abis/Allo.json";
import BaseStrategyABI from "./abis/BaseStrategy.json";

// It's crucial that these imported ABI files are COMPLETE and ACCURATE for each strategy.
// These should be sourced from official Allo Protocol resources or Grants Stack references.
import DirectGrantsLiteStrategyABI from "./abis/DirectGrantsLiteStrategy.json";
import DirectGrantsSimpleStrategyABI from "./abis/DirectGrantsSimpleStrategy.json";
import MerklePayoutStrategyABI from "./abis/MerklePayoutStrategy.json";
import MicroGrantsStrategyABI from "./abis/MicroGrantsStrategy.json";
import RFPSimpleStrategyABI from "./abis/RFPSimpleStrategy.json";
import DonationVotingMerkleDistributionDirectTransferStrategyABI from "./abis/DonationVotingMerkleDistributionDirectTransferStrategy.json";
// Add imports for other strategy ABIs as needed, ensuring they are complete.

import { errorManager } from "@/components/Utilities/errorManager";

const STRATEGY_ABIS_BY_CANONICAL_NAME: Record<string, any> = {
  "DirectGrantsLiteStrategy": DirectGrantsLiteStrategyABI,
  "DirectGrantsSimpleStrategy": DirectGrantsSimpleStrategyABI,
  "MerklePayoutStrategy": MerklePayoutStrategyABI,
  "MicroGrantsStrategy": MicroGrantsStrategyABI,
  "RFPSimpleStrategy": RFPSimpleStrategyABI,
  "RFPCommitteeStrategy": RFPSimpleStrategyABI, // Assuming RFP Committee uses the same ABI as Simple. Verify for completeness.
  "DonationVotingMerkleDistributionDirectTransferStrategy": DonationVotingMerkleDistributionDirectTransferStrategyABI,
  // Add other strategies here, e.g.:
  // "QuadraticFundingStrategy": QuadraticFundingStrategyABI, 
};

// Legacy mapping by STRATEGY_TYPES - can be phased out if canonical names are used consistently.
const STRATEGY_ABIS_LEGACY: Record<string, any> = {
  [STRATEGY_TYPES.DIRECT_GRANTS_LITE]: DirectGrantsLiteStrategyABI,
  [STRATEGY_TYPES.DIRECT_GRANTS_SIMPLE]: DirectGrantsSimpleStrategyABI,
  [STRATEGY_TYPES.MERKLE_PAYOUT]: MerklePayoutStrategyABI,
  [STRATEGY_TYPES.MICRO_GRANTS]: MicroGrantsStrategyABI,
  [STRATEGY_TYPES.RFP_SIMPLE]: RFPSimpleStrategyABI,
  [STRATEGY_TYPES.RFP_COMMITTEE]: RFPSimpleStrategyABI,
};

// Definition of getCanonicalStrategyName moved to the top to ensure it's defined before use.
export async function getCanonicalStrategyName(
  strategyAddress: Address,
  chainId: number
): Promise<string | null> { // Explicit return type added
  try {
    const tempClient = await getRPCClient(chainId);
    const baseContract = getContract({
      address: strategyAddress,
      abi: BaseStrategyABI, 
      client: tempClient as PublicClient,
    });

    if (baseContract.read.getStrategyId) {
      console.log("getStrategyId function found on contract");
      try {
        const strategyIdBytes = await baseContract.read.getStrategyId() as `0x${string}`;
        if (strategyIdBytes && strategyIdBytes !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          const strategyIdHex = strategyIdBytes.toString().toLowerCase();
          console.log(`Raw strategy ID (bytes32) for ${strategyAddress} on chain ${chainId}: ${strategyIdHex}`);

          // THIS MAP IS CRUCIAL and needs to be as comprehensive as possible.
          // Source these from official Allo/Gitcoin Grants Stack deployment data.
          // Maps the bytes32 strategy ID to a canonical name used in STRATEGY_ABIS_BY_CANONICAL_NAME.
          const KNOWN_STRATEGY_ID_HASHES: Record<string, string> = {
            // Example: Celo Mainnet (42220) DonationVotingMerkleDistributionDirectTransferStrategy
            "0x9fa6890423649187b1f0e8bf4265f0305ce99523c3d11aa36b35a54617bb0ec0": "DonationVotingMerkleDistributionDirectTransferStrategy",
            "0x6f9291df02b2664139cec5703d8a9f21c5b7b7d6b9d2e9c4a4bb8c8d8f4a3b2c": "DonationVotingMerkleDistributionDirectTransferStrategy", // Example, verify this hash
            "0x4a69e9a6b7e7e0b8b45c2e7f8e0b7a5e4b7e8f9c2d8e6c5a7b4e9c8e7f6a9b": "DonationVotingMerkleDistributionDirectTransferStrategy", // Example, verify this hash
            // Add more known official strategy ID hashes and their canonical names here.
            // e.g. "0xhashForDirectGrantsSimpleV1OnMainnet": "DirectGrantsSimpleStrategy",
          };
          
          if (KNOWN_STRATEGY_ID_HASHES[strategyIdHex]) {
            const canonicalName = KNOWN_STRATEGY_ID_HASHES[strategyIdHex];
            console.log(`Mapped strategy ID hash ${strategyIdHex} to canonical name: ${canonicalName}`);
            return canonicalName;
          }
          
          // Fallback for DonationVotingMerkleDistributionDirectTransferStrategy by function signature (example)
          // This could be expanded or made more generic if certain strategies have unique function patterns.
          if (baseContract.read.updateDistribution && baseContract.read.distributionMetadata) {
             if (strategyIdHex === "0x6f9291df02b2664139cec5703d8a9f21c5b7b7d6b9d2e9c4a4bb8c8d8f4a3b2c" || 
                 strategyIdHex === "0x4a69e9a6b7e7e0b8b45c2e7f8e0b7a5e4b7e8f9c2d8e6c5a7b4e9c8e7f6a9b" ||
                 strategyIdHex === "0x9fa6890423649187b1f0e8bf4265f0305ce99523c3d11aa36b35a54617bb0ec0" ) { // Only if it's a known hash for this type
                console.log("Detected DonationVotingMerkleDistributionDirectTransferStrategy by function signature and known hash pattern.");
                return "DonationVotingMerkleDistributionDirectTransferStrategy";
             }
          }
          console.warn(`Strategy ID hash ${strategyIdHex} not found in KNOWN_STRATEGY_ID_HASHES for ${strategyAddress}. It might be a new or unknown strategy.`);
        }
      } catch (e) {
        errorManager(`Call to getStrategyId() failed for ${strategyAddress}`, { error: e, strategyAddress, chainId });
      }
    } else {
        console.log(`getStrategyId function not found on contract ${strategyAddress} using BaseStrategyABI.`);
    }
    
    if (baseContract.read.STRATEGY_NAME) {
      try {
        const nameFromContract = await baseContract.read.STRATEGY_NAME() as string;
        if (nameFromContract && typeof nameFromContract === 'string') {
          console.log(`Read STRATEGY_NAME constant from ${strategyAddress}: ${nameFromContract}`);
          // Check if this name matches a key in our canonical ABI map
          if (STRATEGY_ABIS_BY_CANONICAL_NAME[nameFromContract]) {
            return nameFromContract;
          }
          console.warn(`STRATEGY_NAME '${nameFromContract}' from contract does not match any key in STRATEGY_ABIS_BY_CANONICAL_NAME.`);
        }
      } catch (e) {
        errorManager(`Reading STRATEGY_NAME failed for ${strategyAddress}`, { error: e, strategyAddress, chainId });
      }
    }

    console.warn(`Could not determine canonical strategy name for: ${strategyAddress} on chain ${chainId}.`);
    return null;
  } catch (error) {
    errorManager("Error in getCanonicalStrategyName", {error, strategyAddress, chainId});
    return null;
  }
}

export async function getAlloContract(chainId: number) {
  try {
    const client = await getRPCClient(chainId);
    const chainName = getChainNameById(chainId);
    const address = ALLO_CONTRACT_ADDRESSES[chainName];

    if (!address) {
      throw new Error(`Allo contract not deployed on chain ${chainName}`);
    }

    return getContract({
      address,
      abi: AlloABI,
      client: client as PublicClient,
    });
  } catch (error) {
    errorManager("Error getting Allo contract", { error, chainId });
    throw error;
  }
}

export function getAlloContractWithSigner(
  chainId: number,
  walletClient: WalletClient
) {
  try {
    const chainName = getChainNameById(chainId);
    const address = ALLO_CONTRACT_ADDRESSES[chainName];

    if (!address) {
      throw new Error(`Allo contract not deployed on chain ${chainName}`);
    }

    return getContract({
      address,
      abi: AlloABI,
      client: walletClient,
    });
  } catch (error) {
    errorManager("Error getting Allo contract with signer", { error, chainId });
    throw error;
  }
}

export async function getStrategyContract(
  strategyAddress: Address,
  chainId: number,
  knownCanonicalStrategyName?: string 
) {
  try {
    const client = await getRPCClient(chainId);
    let abi = BaseStrategyABI; 

    const canonicalName = knownCanonicalStrategyName || await getCanonicalStrategyName(strategyAddress, chainId);

    if (canonicalName && STRATEGY_ABIS_BY_CANONICAL_NAME[canonicalName]) {
      abi = STRATEGY_ABIS_BY_CANONICAL_NAME[canonicalName];
      console.log(`Using specific ABI for strategy: ${canonicalName}`);
    } else if (canonicalName && STRATEGY_ABIS_LEGACY[canonicalName]) { 
      abi = STRATEGY_ABIS_LEGACY[canonicalName];
      console.log(`Using legacy ABI for strategy: ${canonicalName}`);
    } else if (canonicalName) {
      console.warn(`No specific ABI found for strategy '${canonicalName}'. Falling back to BaseStrategyABI.`);
    } else {
      console.warn(`Could not determine strategy type for ${strategyAddress}. Falling back to BaseStrategyABI.`);
    }

    return getContract({
      address: strategyAddress,
      abi,
      client: client as PublicClient,
    });
  } catch (error) {
    errorManager("Error getting strategy contract", {error, strategyAddress, chainId});
    throw error;
  }
}

export async function getStrategyContractWithSigner(
  strategyAddress: Address,
  walletClient: WalletClient,
  chainId: number, 
  knownCanonicalStrategyName?: string
) {
  try {
    let abi = BaseStrategyABI; 
    
    const canonicalName = knownCanonicalStrategyName || await getCanonicalStrategyName(strategyAddress, chainId);

    if (canonicalName && STRATEGY_ABIS_BY_CANONICAL_NAME[canonicalName]) {
      abi = STRATEGY_ABIS_BY_CANONICAL_NAME[canonicalName];
      console.log(`Using specific ABI for strategy (signer): ${canonicalName}`);
    } else if (canonicalName && STRATEGY_ABIS_LEGACY[canonicalName]) { 
      abi = STRATEGY_ABIS_LEGACY[canonicalName];
      console.log(`Using legacy ABI for strategy (signer): ${canonicalName}`);
    } else if (canonicalName) {
      console.warn(`No specific ABI found for strategy '${canonicalName}' (signer). Falling back to BaseStrategyABI.`);
    } else {
      console.warn(`Could not determine strategy type for ${strategyAddress} (signer). Falling back to BaseStrategyABI.`);
    }

    return getContract({
      address: strategyAddress,
      abi,
      client: walletClient,
    });
  } catch (error) {
    errorManager("Error getting strategy contract with signer", {error, strategyAddress, chainId});
    throw error;
  }
}

export async function detectStrategyType(
  strategyAddress: Address,
  chainId: number
): Promise<string | null> {
  try {
    // User's console.log was here: console.log(`Getting strategy ID for ${strategyAddress} on chain ${chainId}`);
    // Replaced with a more generic detection message or remove if too verbose.
    console.log(`Detecting strategy type for ${strategyAddress} on chain ${chainId}`); 
    const canonicalName = await getCanonicalStrategyName(strategyAddress, chainId);
    
    if (!canonicalName) {
      console.log(`No canonical strategy name found for ${strategyAddress}`);
      return null;
    }
    
    // Check if we have this strategy in our STRATEGY_REGISTRY (from ../strategyRegistry.ts)
    const strategyRegistryInfo = getStrategyInfo(canonicalName, chainId); 
    if (strategyRegistryInfo) {
      console.log(`Found strategy in registry using canonical name '${canonicalName}': ${strategyRegistryInfo.name}`);
      return canonicalName; // Return the canonical name
    }
    
    console.log(`Strategy with canonical name '${canonicalName}' not in strategyRegistry. Returning canonical name anyway for potential use or display.`);
    return canonicalName; 
    
  } catch (error) {
    errorManager("Error detecting strategy type", {error, strategyAddress, chainId});
    return null;
  }
}

export function getStrategyCapabilities(canonicalStrategyName: string, chainId: number) {
  try {
    const strategyInfoFromRegistry = getStrategyInfo(canonicalStrategyName, chainId); 
    
    if (strategyInfoFromRegistry) {
      return {
        supportsDirectDistribution: strategyInfoFromRegistry.supportsDirectDistribution,
        requiresMerkleTree: strategyInfoFromRegistry.requiresMerkleTree,
        requiresClaiming: strategyInfoFromRegistry.requiresClaiming,
        description: strategyInfoFromRegistry.description
      };
    }
    
    // Fallback to old STRATEGY_CAPABILITIES if the canonical name matches a legacy key.
    // This part might need adjustment based on how STRATEGY_CAPABILITIES is keyed.
    if (STRATEGY_CAPABILITIES[canonicalStrategyName as keyof typeof STRATEGY_CAPABILITIES]) {
        console.warn(`Falling back to legacy STRATEGY_CAPABILITIES for ${canonicalStrategyName}`);
        return STRATEGY_CAPABILITIES[canonicalStrategyName as keyof typeof STRATEGY_CAPABILITIES];
    }
    
    console.error(`No capabilities found for strategy: ${canonicalStrategyName} on chain ${chainId}. It may not be in strategyRegistry.ts or legacy STRATEGY_CAPABILITIES.`);
    return {
      supportsDirectDistribution: false,
      requiresMerkleTree: false,
      requiresClaiming: false,
      description: "Unknown strategy type or capabilities not defined"
    };
  } catch (error) {
    errorManager("Error getting strategy capabilities", {error, canonicalStrategyName, chainId});
    throw error; 
  }
}

export function supportsDirectDistribution(canonicalStrategyName: string, chainId: number): boolean {
  try {
    const capabilities = getStrategyCapabilities(canonicalStrategyName, chainId);
    return capabilities.supportsDirectDistribution;
  } catch (error) {
    // errorManager is called in getStrategyCapabilities if it throws, so just log here or handle gracefully.
    console.error(`Error in supportsDirectDistribution for ${canonicalStrategyName}:`, error);
    return false; 
  }
} 