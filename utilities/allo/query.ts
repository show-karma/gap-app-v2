import { parseUnits, formatUnits } from "viem";
import type { Address } from "viem";
import { getAlloContract, getStrategyContract, detectStrategyType, getStrategyCapabilities } from "./contracts";
import { getStrategyName } from "./strategyRegistry";
import { getPoolRecipients, validateRecipientsInPool, type RecipientInfo } from "./recipients";
import { getTokenInfo, formatTokenAmount, type TokenInfo } from "./tokens";
import type { PoolInfo, ApprovedApplication, PoolData } from "@/types/allo";
import { STRATEGY_TYPES } from "./config";

/**
 * Get pool information including strategy details and approved applications
 */
export async function getPoolInfo(poolId: string, chainId: number): Promise<PoolInfo> {
  console.log(`Fetching pool info for poolId: ${poolId} on chainId: ${chainId}`);
  
  try {
    const allo = await getAlloContract(chainId);
    
    // Get pool data from Allo contract
    console.log("Calling getPool on Allo contract...");
    const poolData = await allo.read.getPool([BigInt(poolId)]) as PoolData;
    console.log("Pool data received:", poolData);
    
    // Get token information
    console.log(`Fetching token info for ${poolData.token} on chain ${chainId}`);
    const tokenInfo = await getTokenInfo(poolData.token, chainId);
    console.log("Token info received:", tokenInfo);
    
    // Get strategy contract instance
    const strategyAddress = poolData.strategy;
    console.log("Strategy address:", strategyAddress);
    
    const strategyContract = await getStrategyContract(strategyAddress, chainId);
    
    // Detect strategy type using the new approach (gets strategy ID)
    //const strategyId = await detectStrategyType(strategyAddress, chainId);
    const strategyId = "0x9fa6890423649187b1f0e8bf4265f0305ce99523c3d11aa36b35a54617bb0ec0";
    console.log("Detected strategy ID:", strategyId);
    
    // Get human-readable strategy name using the new registry
    const strategyName = strategyId ? 
      getStrategyName(strategyId, chainId) : 
      `Custom Strategy (${strategyAddress.slice(0, 6)}...${strategyAddress.slice(-4)})`;
    
    // Get pool amount from strategy
    let poolAmount = BigInt(0);
    try {
      poolAmount = await strategyContract.read.getPoolAmount() as bigint;
      console.log("Pool amount from getPoolAmount:", poolAmount);
    } catch (error) {
      console.error("Error getting pool amount with getPoolAmount:", error);
      // Try alternative method - some strategies might use different function names
      try {
        poolAmount = await strategyContract.read.poolAmount() as bigint;
        console.log("Pool amount from poolAmount:", poolAmount);
      } catch (error2) {
        console.error("Error getting pool amount with poolAmount:", error2);
        // Try to get balance from token if pool has native token
        try {
          // Check if strategy has a balance
          // This is a simplified approach - in production you'd check the actual token balance
          console.log("Unable to get pool amount from strategy");
        } catch (error3) {
          console.error("Failed to get any pool balance:", error3);
        }
      }
    }
    
    // Get approved applications using the new recipient fetching system
    const approvedApplications = await getApprovedApplications(strategyAddress, chainId, strategyId, poolId);
    
    const poolInfo: PoolInfo = {
      poolId,
      chainId,
      totalAmount: poolAmount,
      availableAmount: poolAmount, // This might need adjustment based on allocated amounts
      token: tokenInfo,
      strategy: {
        address: strategyAddress,
        type: strategyId || "Unknown",
        name: strategyName,
      },
      approvedApplications,
      totalApprovedCount: approvedApplications.length,
    };
    
    console.log("Final pool info:", poolInfo);
    return poolInfo;
    
  } catch (error) {
    console.error("Error in getPoolInfo:", error);
    throw new Error(`Failed to get pool information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get approved applications for a strategy using the new recipient fetching system
 */
async function getApprovedApplications(
  strategyAddress: Address,
  chainId: number,
  strategyId: string | null,
  poolId: string
): Promise<ApprovedApplication[]> {
  if (!strategyId) {
    console.log("No strategy ID available, returning empty applications list");
    return [];
  }

  try {
    // Use the new recipient fetching system
    const recipients = await getPoolRecipients(poolId, chainId, strategyAddress, strategyId);
    
    // Convert RecipientInfo to ApprovedApplication format
    const applications: ApprovedApplication[] = recipients
      .filter(recipient => recipient.status === 'approved')
      .map(recipient => ({
        recipientId: recipient.recipientId,
        recipientAddress: recipient.recipientAddress,
        profileId: recipient.profileId,
        applicationData: recipient.applicationData,
        status: 'approved' as const
      }));
    
    console.log(`Found ${applications.length} approved applications for pool ${poolId}`);
    return applications;
    
  } catch (error) {
    console.error("Error getting approved applications:", error);
    return [];
  }
}

/**
 * Check if addresses are approved recipients in the pool using the new validation system
 */
export async function checkApprovedRecipients(
  poolId: string,
  chainId: number,
  addresses: Address[]
): Promise<Map<Address, boolean>> {
  try {
    // Get pool info to access strategy details
    const poolInfo = await getPoolInfo(poolId, chainId);
    
    // Use the new recipient validation system
    const approvedMap = await validateRecipientsInPool(
      poolId,
      chainId,
      poolInfo.strategy.address,
      poolInfo.strategy.type,
      addresses
    );
    
    console.log(`Validated ${addresses.length} addresses for pool ${poolId}`);
    return approvedMap;
    
  } catch (error) {
    console.error("Error checking approved recipients:", error);
    
    // Fallback: assume all addresses are approved for testing
    const approvedMap = new Map<Address, boolean>();
    addresses.forEach(address => {
      approvedMap.set(address, true); // Temporarily approve all for testing
    });
    
    return approvedMap;
  }
}

/**
 * Format pool amount for display using token information
 */
export function formatPoolAmount(amount: bigint, tokenInfo?: TokenInfo): string {
  if (tokenInfo) {
    return formatTokenAmount(amount, tokenInfo);
  }
  // Fallback to ETH formatting for backwards compatibility
  return `${formatUnits(amount, 18)} ETH`;
}

/**
 * Parse amount string to bigint
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
} 