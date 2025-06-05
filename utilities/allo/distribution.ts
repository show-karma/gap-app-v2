import type { WalletClient, Address } from "viem";
import { getStrategyContractWithSigner } from "./contracts";
import { getDirectDistributionStrategies, supportsDirectDistribution } from "./strategyRegistry";
import { generateMerkleDistribution } from "./merkle";
import type { ValidatedCSVRow } from "@/types/allo";

/**
 * Execute distribution for direct distribution strategies
 */
export async function executeDirectDistribution(
  strategyAddress: Address,
  strategyId: string,
  csvData: ValidatedCSVRow[],
  walletClient: WalletClient,
  chainId: number
): Promise<string> {
  const strategyContract = await getStrategyContractWithSigner(
    strategyAddress,
    walletClient,
    chainId,
    strategyId
  );

  const addresses = csvData.map(row => row.checksummedAddress);
  const amounts = csvData.map(row => row.parsedAmount);

  // Different strategies have different function signatures
  if (strategyId === "DirectGrantsLiteStrategy" || 
      strategyId === "DirectGrantsSimpleStrategy") {
    
    // For DirectGrants strategies, we need to allocate first, then distribute
    
    // Step 1: Allocate funds to recipients
    const allocateTx = await strategyContract.write.allocate([addresses, amounts]);
    console.log("Allocation transaction:", allocateTx);
    
    // Step 2: Distribute the allocated funds
    const distributeTx = await strategyContract.write.distribute([addresses, "0x"]);
    console.log("Distribution transaction:", distributeTx);
    
    return distributeTx;
    
  } else if (strategyId === "MicroGrantsStrategy") {
    
    // For MicroGrants, allocate and distribute in one call
    const allocateTx = await strategyContract.write.allocate([addresses, amounts]);
    console.log("MicroGrants allocation transaction:", allocateTx);
    
    // Then distribute
    const distributeTx = await strategyContract.write.distribute([addresses]);
    console.log("MicroGrants distribution transaction:", distributeTx);
    
    return distributeTx;
    
  } else if (strategyId === "DonationVotingMerkleDistributionDirectTransferStrategy") {
    
    // For DonationVoting with DirectTransfer, we need to set merkle root first, then distribute
    console.log("Executing merkle-based direct transfer for DonationVoting strategy...");
    
    // Step 1: Generate merkle tree
    const merkleDistribution = generateMerkleDistribution(csvData);
    console.log("Generated merkle distribution:", {
      root: merkleDistribution.merkleRoot,
      totalDistributions: merkleDistribution.distributions.length
    });
    
    // Step 2: Set the merkle root using updateDistribution
    const updateDistributionTx = await strategyContract.write.updateDistribution([
      merkleDistribution.merkleRoot,
      {
        protocol: BigInt(1), // Standard protocol version
        pointer: "ipfs://distribution-metadata" // Could point to IPFS hash with full distribution data
      }
    ]);
    console.log("UpdateDistribution transaction:", updateDistributionTx);
    
    // Wait for the update transaction to be mined before proceeding
    // In a real implementation, you might want to wait for confirmations
    
    // Step 3: Execute direct distribution
    const distributeTx = await strategyContract.write.distribute([
      addresses,  // recipient addresses
      amounts,    // amounts in wei
      "0x"       // empty data field for direct transfer
    ]);
    
    console.log("DonationVoting DirectTransfer distribution transaction:", distributeTx);
    return distributeTx;
    
  } else {
    throw new Error(`Direct distribution not supported for strategy: ${strategyId}`);
  }
}

/**
 * Check if user has permission to distribute from pool
 */
export async function checkDistributionPermission(
  poolId: string,
  userAddress: Address,
  chainId: number
): Promise<boolean> {
  // This would need to check if the user is a pool manager or has distribution rights
  // For now, we'll assume all connected users have permission
  // In production, this would check roles on the Allo contract
  console.log(`Checking distribution permission for user ${userAddress} on pool ${poolId}`);
  return true;
}

/**
 * Prepare distribution data for different strategy types using the new registry
 */
export function prepareDistributionData(
  strategyId: string,
  csvData: ValidatedCSVRow[],
  chainId: number
): {
  canDistribute: boolean;
  requiresAllocation: boolean;
  requiresMerkleRoot: boolean;
  totalRecipients: number;
  totalAmount: bigint;
  estimatedGas: string;
} {
  const totalAmount = csvData.reduce((sum, row) => sum + row.parsedAmount, BigInt(0));
  
  // Check if strategy supports direct distribution
  const canDistribute = supportsDirectDistribution(strategyId, chainId);
  
  // Check if strategy requires allocation step
  const requiresAllocation = [
    "DirectGrantsLiteStrategy",
    "DirectGrantsSimpleStrategy"
  ].includes(strategyId);
  
  // Check if strategy requires merkle root setup
  const requiresMerkleRoot = strategyId === "DonationVotingMerkleDistributionDirectTransferStrategy";
  
  // DonationVotingMerkleDistributionDirectTransferStrategy can distribute directly without allocation
  const isDonationVotingDirect = strategyId === "DonationVotingMerkleDistributionDirectTransferStrategy";
  
  return {
    canDistribute,
    requiresAllocation: requiresAllocation && !isDonationVotingDirect,
    requiresMerkleRoot,
    totalRecipients: csvData.length,
    totalAmount,
    estimatedGas: `~${Math.min(csvData.length * 75000, 1500000).toLocaleString()}`, // Higher gas for merkle operations
  };
} 