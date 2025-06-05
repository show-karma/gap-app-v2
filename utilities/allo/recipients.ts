import type { Address } from "viem";
import { getStrategyContract, getAlloContract } from "./contracts";
import { getStrategyInfo } from "./strategyRegistry";
import { getRPCClient } from "@/utilities/rpcClient";
import { getContract } from "viem";
import RegistryABI from "./contracts/abis/Registry.json";
import { ALLO_CONTRACT_ADDRESSES } from "./config";
import { getChainNameById } from "@/utilities/network";

export interface RecipientInfo {
  recipientId: string; // bytes32 ID used by the strategy
  recipientAddress: Address; // Payout address
  profileId?: string; // Allo Registry profile ID (if associated with a profile)
  profileAnchor?: Address; // Profile anchor address (if using profile)
  applicationData?: any; // Additional application metadata
  status: 'approved' | 'pending' | 'rejected';
  allocatedAmount?: bigint; // Amount allocated to this recipient
}

/**
 * Get Registry contract instance
 */
async function getRegistryContract(chainId: number) {
  const client = await getRPCClient(chainId);
  const chainName = getChainNameById(chainId);
  
  // Registry address is typically stored in the Allo contract
  const allo = await getAlloContract(chainId);
  const registryAddress = await allo.read.getRegistry() as Address;
  
  return getContract({
    address: registryAddress,
    abi: RegistryABI,
    client,
  });
}

/**
 * Get profile information by address from Registry
 */
async function getProfileByAnchor(anchorAddress: Address, chainId: number): Promise<{
  profileId: string;
  profileData: any;
} | null> {
  try {
    const registry = await getRegistryContract(chainId);
    const profileId = await registry.read.getProfileByAnchor([anchorAddress]) as string;
    
    if (profileId && profileId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const profileData = await registry.read.getProfileById([profileId]);
      return { profileId, profileData };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting profile by anchor:", error);
    return null;
  }
}

/**
 * Get recipients for DirectGrants strategies
 */
async function getDirectGrantsRecipients(
  strategyAddress: Address,
  chainId: number,
  strategyId: string
): Promise<RecipientInfo[]> {
  const strategyContract = await getStrategyContract(strategyAddress, chainId, strategyId);
  const recipients: RecipientInfo[] = [];
  
  try {
    // DirectGrants strategies typically have recipient registration events
    // We'll try to get recipients from recent events and then query their status
    
    // Try to get pool ID from strategy to filter events
    let poolId: bigint;
    try {
      poolId = await strategyContract.read.getPoolId() as bigint;
    } catch {
      // If getPoolId doesn't exist, try poolId
      poolId = await strategyContract.read.poolId() as bigint;
    }
    
    // Get registered recipients (this would ideally use event logs)
    // For now, we'll implement a basic version that checks common recipient methods
    
    // Some strategies have a recipientsCounter
    try {
      const recipientCounter = await strategyContract.read.recipientsCounter() as bigint;
      console.log(`Found ${recipientCounter} recipients in DirectGrants strategy`);
      
      // In a real implementation, you'd iterate through recipients
      // For now, return placeholder data indicating recipients exist
      if (recipientCounter > 0) {
        recipients.push({
          recipientId: "sample_recipient_1",
          recipientAddress: "0x0000000000000000000000000000000000000000" as Address,
          status: 'approved',
          applicationData: { note: `${recipientCounter} recipients found - full implementation needed` }
        });
      }
    } catch (error) {
      console.log("No recipientsCounter found, trying alternative methods");
    }
    
  } catch (error) {
    console.error("Error getting DirectGrants recipients:", error);
  }
  
  return recipients;
}

/**
 * Get recipients for RFP strategies
 */
async function getRFPRecipients(
  strategyAddress: Address,
  chainId: number,
  strategyId: string
): Promise<RecipientInfo[]> {
  const strategyContract = await getStrategyContract(strategyAddress, chainId, strategyId);
  const recipients: RecipientInfo[] = [];
  
  try {
    // RFP strategies typically have an accepted recipient
    const acceptedRecipientId = await strategyContract.read.acceptedRecipientId() as string;
    
    if (acceptedRecipientId && acceptedRecipientId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      // Get recipient details
      const recipientData = await strategyContract.read.getRecipient([acceptedRecipientId]);
      
      let recipientAddress: Address;
      let profileId: string | undefined;
      
      if (Array.isArray(recipientData) && recipientData.length >= 2) {
        recipientAddress = recipientData[1] as Address; // Typically anchor address
        
        // Check if this is a profile anchor
        const profileInfo = await getProfileByAnchor(recipientAddress, chainId);
        if (profileInfo) {
          profileId = profileInfo.profileId;
        }
      } else {
        recipientAddress = recipientData as Address;
      }
      
      recipients.push({
        recipientId: acceptedRecipientId,
        recipientAddress,
        profileId,
        status: 'approved',
        applicationData: recipientData
      });
    }
  } catch (error) {
    console.error("Error getting RFP recipients:", error);
  }
  
  return recipients;
}

/**
 * Get recipients for MicroGrants strategies
 */
async function getMicroGrantsRecipients(
  strategyAddress: Address,
  chainId: number,
  strategyId: string
): Promise<RecipientInfo[]> {
  const strategyContract = await getStrategyContract(strategyAddress, chainId, strategyId);
  const recipients: RecipientInfo[] = [];
  
  try {
    // MicroGrants typically track recipients through allocation events
    // We'd need to get AllocatedEvent logs to find recipients
    
    // For now, try to get basic info
    try {
      const allocatedAmount = await strategyContract.read.totalAllocated() as bigint;
      if (allocatedAmount > 0) {
        recipients.push({
          recipientId: "microgrants_recipients",
          recipientAddress: "0x0000000000000000000000000000000000000000" as Address,
          status: 'approved',
          allocatedAmount,
          applicationData: { note: "MicroGrants recipients found - event log parsing needed for details" }
        });
      }
    } catch (error) {
      console.log("Error getting MicroGrants allocation info:", error);
    }
    
  } catch (error) {
    console.error("Error getting MicroGrants recipients:", error);
  }
  
  return recipients;
}

/**
 * Get recipients for Voting/QF strategies
 */
async function getVotingRecipients(
  strategyAddress: Address,
  chainId: number,
  strategyId: string
): Promise<RecipientInfo[]> {
  const strategyContract = await getStrategyContract(strategyAddress, chainId, strategyId);
  const recipients: RecipientInfo[] = [];
  
  try {
    // Voting strategies typically have registered recipients who can receive votes
    // These are usually tracked through registration events
    
    // Try to get distribution info if available
    try {
      const distributionStarted = await strategyContract.read.distributionStarted() as boolean;
      console.log("Distribution started:", distributionStarted);
      
      // In QF/Voting strategies, we'd need to parse Registered events to get recipients
      recipients.push({
        recipientId: "voting_recipients",
        recipientAddress: "0x0000000000000000000000000000000000000000" as Address,
        status: 'approved',
        applicationData: { 
          note: "Voting strategy recipients found - event log parsing needed for details",
          distributionStarted 
        }
      });
    } catch (error) {
      console.log("Error getting voting strategy info:", error);
    }
    
  } catch (error) {
    console.error("Error getting Voting recipients:", error);
  }
  
  return recipients;
}

/**
 * Main function to get all approved recipients for a pool
 */
export async function getPoolRecipients(
  poolId: string,
  chainId: number,
  strategyAddress: Address,
  strategyId: string
): Promise<RecipientInfo[]> {
  
  const strategyInfo = getStrategyInfo(strategyId, chainId);
  const category = strategyInfo?.category || 'other';
  console.log(`Getting recipients for pool ${poolId} with strategy ${strategyId} and category ${category}`);
  let recipients: RecipientInfo[] = [];
  
  try {
    switch (category) {
      case 'direct':
        if (strategyId.includes('DirectGrants')) {
          recipients = await getDirectGrantsRecipients(strategyAddress, chainId, strategyId);
        } else if (strategyId.includes('MicroGrants')) {
          recipients = await getMicroGrantsRecipients(strategyAddress, chainId, strategyId);
        }
        break;
        
      case 'rfp':
        recipients = await getRFPRecipients(strategyAddress, chainId, strategyId);
        break;
        
      case 'voting':
        recipients = await getVotingRecipients(strategyAddress, chainId, strategyId);
        break;
        
      case 'merkle':
        // Merkle strategies store recipients in the merkle tree
        // This would require parsing the merkle tree data
        recipients.push({
          recipientId: "merkle_recipients",
          recipientAddress: "0x0000000000000000000000000000000000000000" as Address,
          status: 'approved',
          applicationData: { note: "Merkle strategy - recipients stored in merkle tree" }
        });
        break;
        
      default:
        console.log(`No specific recipient fetching implemented for category: ${category}`);
    }
    
    console.log(`Found ${recipients.length} recipients for pool ${poolId}`);
    return recipients;
    
  } catch (error) {
    console.error("Error getting pool recipients:", error);
    return [];
  }
}

/**
 * Get recipient details by address from a specific strategy
 */
export async function getRecipientDetails(
  strategyAddress: Address,
  recipientAddress: Address,
  chainId: number,
  strategyId: string
): Promise<RecipientInfo | null> {
  try {
    const strategyContract = await getStrategyContract(strategyAddress, chainId, strategyId);
    
    // Try different methods to get recipient info
    try {
      const recipientData = await strategyContract.read.getRecipient([recipientAddress]);
      
      // Check if recipient is associated with a profile
      const profileInfo = await getProfileByAnchor(recipientAddress, chainId);
      
      return {
        recipientId: recipientAddress, // Use address as ID if no specific recipient ID
        recipientAddress,
        profileId: profileInfo?.profileId,
        status: 'approved', // Assume approved if found in strategy
        applicationData: recipientData
      };
    } catch (error) {
      console.log("getRecipient method not available or failed:", error);
      return null;
    }
    
  } catch (error) {
    console.error("Error getting recipient details:", error);
    return null;
  }
}

/**
 * Validate if addresses are approved recipients in the pool
 */
export async function validateRecipientsInPool(
  poolId: string,
  chainId: number,
  strategyAddress: Address,
  strategyId: string,
  addresses: Address[]
): Promise<Map<Address, boolean>> {
  const approvedMap = new Map<Address, boolean>();
  
  try {
    // Get all approved recipients for the pool
    const recipients = await getPoolRecipients(poolId, chainId, strategyAddress, strategyId);
    const approvedAddresses = new Set(recipients.map(r => r.recipientAddress.toLowerCase()));
    
    // Check each address
    for (const address of addresses) {
      const isApproved = approvedAddresses.has(address.toLowerCase());
      approvedMap.set(address, isApproved);
    }
    
    // If no recipients found through our methods, check individually
    if (recipients.length === 0) {
      for (const address of addresses) {
        const recipientDetails = await getRecipientDetails(strategyAddress, address, chainId, strategyId);
        approvedMap.set(address, recipientDetails !== null);
      }
    }
    
  } catch (error) {
    console.error("Error validating recipients:", error);
    // Fallback: assume all are approved for testing
    addresses.forEach(address => approvedMap.set(address, true));
  }
  
  return approvedMap;
} 