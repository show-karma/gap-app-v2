import fetchData from "../fetchData";
import {number} from "zod";

// Types
export interface FaucetEligibilityResponse {
  eligible: boolean;
  reason?: string;
  gasUnits?: string;
  gasPrice?: string;
  totalAmount?: string;
  faucetAddress: string;
  nextAvailableTime?: Date;
  waitTimeSeconds?: number;
  currentBalance?: string;
}

export interface ChainResponse {
    chainId: number
    createdAt: string
    decimals: number
    explorerUrl?: number
    id: string
    metadata: any
    name: string
    rpcUrl?: string
    symbol: string
    updatedAt: string
}
export interface FaucetRequestResponse {
  requestId: string;
  eligible: boolean;
  gasUnits: string;
  gasPrice: string;
  totalAmount: string;
  expiresAt: Date;
  faucetAddress: string;
}

export interface FaucetClaimResponse {
  requestId: string;
  transactionHash: string;
  status: string;
  blockNumber?: string;
  gasUsed?: string;
}

export interface FaucetRequest {
  id: string;
  chainId: number;
  walletAddress: string;
  contractAddress: string;
  amount: string;
  gasUnits: string;
  gasPrice: string;
  transactionHash?: string;
  status: string;
  claimedAt?: Date;
  expiresAt: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse {
    totalCount: number,
    page: number,
    limit: number,
    totalPages: number,
    nextPage: number | null,
    prevPage: number | null,
    hasNextPage: boolean,
    hasPrevPage: boolean
}
export interface FaucetRequests {
    payload: FaucetRequest[]
    pagination: PaginatedResponse
}

export interface WhitelistedPaginatedResponse {
    data: WhitelistedContract[]
    pagination: PaginatedResponse
}

export interface BlockedPaginatedResponse {
    data: BlockedAddress[]
    pagination: PaginatedResponse
}

export interface FaucetBalance {
  chainId: number;
  chainName: string;
  balance: string;
  symbol: string;
  isLow: boolean;
  threshold: string;
}

export interface FaucetStats {
  totalRequests: number;
  successfulClaims: number;
  failedClaims: number;
  totalAmountDistributed: string;
  uniqueAddresses: number;
}

export interface FaucetTransaction {
  to: string;
  data?: string;
  value?: string;
}

export interface FaucetChainSettings {
  id?: string;
  chainId: number;
  maxAmountPerRequest: string;
  rateLimitHours?: number;
  bufferPercentage?: number;
  lowBalanceThreshold: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FaucetGlobalConfig {
  id?: string;
  defaultRateLimitHours: number;
  defaultBufferPercentage: number;
  maxChainsPerRequest: number;
  globalEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WhitelistedContract {
  id?: string;
  chainId: number;
  contractAddress: string;
  name: string;
  description?: string;
  maxGasLimit?: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlockedAddress {
  id?: string;
  address: string;
  chainId?: number;
  reason: string;
  expiresAt?: Date;
  blockedAt?: Date;
}

class FaucetService {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Check if an address is eligible for faucet funds
   */
  async checkEligibility(
    chainId: number,
    walletAddress: string,
    transaction: FaucetTransaction
  ): Promise<FaucetEligibilityResponse> {
    const [data, error] = await fetchData(
      `/v2/faucet/check-eligibility/${chainId}`,
      "POST",
      {
        walletAddress,
        transaction
      },
      {},
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to check eligibility: ${error}`);
    }

    return data;
  }

  /**
   * Create a new faucet request
   */
  async createRequest(
    chainId: number,
    walletAddress: string,
    transaction: FaucetTransaction
  ): Promise<FaucetRequestResponse> {
    const [data, error] = await fetchData(
      `/v2/faucet/request`,
      "POST",
      {
        chainId,
        walletAddress,
        transaction
      },
      {},
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to create faucet request: ${error}`);
    }

    return data;
  }

  /**
   * Claim faucet funds for a pending request
   */
  async claimFaucet(requestId: string): Promise<FaucetClaimResponse> {
    const [data, error] = await fetchData(
      `/v2/faucet/claim`,
      "POST",
      {
        requestId
      },
      {},
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to claim faucet: ${error}`);
    }

    return data;
  }

  /**
   * Get faucet request history for an address
   */
  async getHistory(
    address: string,
    chainId?: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ requests: FaucetRequest[]; pageInfo: any }> {
    const params: any = {
      address,
      page,
      limit
    };
    
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    const [data, error] = await fetchData(
      `/v2/faucet/history`,
      "GET",
      {},
      params,
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to get history: ${error}`);
    }

    return data;
  }

  /**
   * Get faucet statistics
   */
  async getStats(chainId?: number, days: number = 7): Promise<FaucetStats> {
    const params: any = {
      days
    };
    
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    const [data, error] = await fetchData(
      `/v2/faucet/stats`,
      "GET",
      {},
      params,
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to get stats: ${error}`);
    }

    return data;
  }

  /**
   * Get faucet balance for a specific chain
   */
  async getBalance(chainId: number): Promise<FaucetBalance> {
    const [data, error] = await fetchData(
      `/v2/faucet/balance/${chainId}`,
      "GET",
      {},
      {},
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }

    return data;
  }

  /**
   * Get faucet balances for all chains
   */
  async getAllBalances(): Promise<{ balances: FaucetBalance[] }> {
    const [data, error] = await fetchData(
      `/v2/faucet/balances`,
      "GET",
      {},
      {},
      {},
      false
    );

    if (error) {
      throw new Error(`Failed to get all balances: ${error}`);
    }

    return data;
  }

  /**
   * Get a specific faucet request by ID
   */
  async getRequest(requestId: string): Promise<FaucetRequest | null> {
    const [data, error] = await fetchData(
      `/v2/faucet/request/${requestId}`,
      "GET",
      {},
      {},
      {},
      false
    );

    if (error) {
      // 404 means request not found
      if (error.includes("404") || error.includes("Not Found")) {
        return null;
      }
      throw new Error(`Failed to get request: ${error}`);
    }

    return data;
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get faucet configuration (admin only)
   */
  async getConfiguration(): Promise<{
      configurations: {
          global: FaucetGlobalConfig;
          chains: FaucetChainSettings[];
      }
    faucetAddress: string;
      "totalChains": string; enabledChains: string;

  }> {
    const [data, error] = await fetchData(
      `/v2/admin/faucet/config`,
      "GET",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get configuration: ${error}`);
    }

    return data;
  }

  /**
   * Update chain-specific faucet settings (admin only)
   */
  async updateChainSettings(
    chainId: number,
    settings: Partial<FaucetChainSettings>
  ): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/settings/${chainId}`,
      "PUT",
      settings,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to update chain settings: ${error}`);
    }
  }

  /**
   * Create faucet settings for a chain (admin only)
   */
  async createChainSettings(
    settings: FaucetChainSettings
  ): Promise<FaucetChainSettings> {
    const [data, error] = await fetchData(
      `/v2/admin/faucet/settings`,
      "POST",
      settings,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to create chain settings: ${error}`);
    }

    return data;
  }

  /**
   * Delete faucet settings for a chain (admin only)
   */
  async deleteChainSettings(chainId: number): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/settings/${chainId}`,
      "DELETE",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to delete chain settings: ${error}`);
    }
  }

  /**
   * Update global faucet configuration (admin only)
   */
  async updateGlobalConfig(
    config: Partial<FaucetGlobalConfig>
  ): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/global-config`,
      "PUT",
      config,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to update global config: ${error}`);
    }
  }

  /**
   * Add contract to whitelist (admin only)
   */
  async whitelistContract(contract: {
    chainId: number;
    contractAddress: string;
    name: string;
    description?: string;
    maxGasLimit?: string;
  }): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/whitelist`,
      "POST",
      contract,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to whitelist contract: ${error}`);
    }
  }

  /**
   * Remove contract from whitelist (admin only)
   */
  async removeFromWhitelist(
    chainId: number,
    contractAddress: string
  ): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/whitelist/${chainId}/${contractAddress}`,
      "DELETE",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to remove from whitelist: ${error}`);
    }
  }

  /**
   * Get whitelisted contracts (admin only)
   */
  async getWhitelistedContracts(
    chainId?: number
  ): Promise<WhitelistedPaginatedResponse> {
    const params: any = {};
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    const [data, error] = await fetchData(
      `/v2/admin/faucet/whitelist`,
      "GET",
      {},
      params,
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get whitelisted contracts: ${error}`);
    }

    return data;
  }

  /**
   * Block an address (admin only)
   */
  async blockAddress(
    address: string,
    reason: string,
    chainId?: number,
    expiresAt?: string
  ): Promise<void> {
    const payload: any = {
      address,
      reason
    };
    
    if (chainId !== undefined) {
      payload.chainId = chainId;
    }
    
    if (expiresAt) {
      payload.expiresAt = expiresAt;
    }

    const [_, error] = await fetchData(
      `/v2/admin/faucet/block`,
      "POST",
      payload,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to block address: ${error}`);
    }
  }

  /**
   * Unblock an address (admin only)
   */
  async unblockAddress(address: string, chainId?: number): Promise<void> {
    const params: any = {};
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    const [_, error] = await fetchData(
      `/v2/admin/faucet/block/${address}`,
      "DELETE",
      {},
      params,
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to unblock address: ${error}`);
    }
  }

  /**
   * Get blocked addresses (admin only)
   */
  async getBlockedAddresses(): Promise<BlockedPaginatedResponse> {
    const [data, error] = await fetchData(
      `/v2/admin/faucet/blocked`,
      "GET",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get blocked addresses: ${error}`);
    }

    return data;
  }

  /**
   * Emergency stop - disable faucet for a chain (admin only)
   */
  async emergencyStop(chainId: number): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/emergency-stop/${chainId}`,
      "POST",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to emergency stop: ${error}`);
    }
  }

  /**
   * Resume faucet operations for a chain (admin only)
   */
  async resumeOperations(chainId: number): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/faucet/resume/${chainId}`,
      "POST",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to resume operations: ${error}`);
    }
  }

  /**
   * Expire old pending requests (admin only)
   */
  async expireOldRequests(): Promise<{ count: number }> {
    const [data, error] = await fetchData(
      `/v2/admin/faucet/expire`,
      "POST",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to expire old requests: ${error}`);
    }

    return data;
  }

  /**
   * Get pending requests (admin only)
   */
  async getRequests({
      page=1,
      limit=10,
      status,
      offset=0,
      chainId
                    }: {
      page: number,
          limit: number,
        status?: 'PENDING' | "FAILED" | "CLAIMED" | "EXPIRED",
      offset?: number,
      chainId?: number
}): Promise<FaucetRequests> {
    const [data, error] = await fetchData(
      `/v2/admin/faucet/requests`,
      "GET",
      {},
      {
          page,
          limit,
          status,
          offset,
          chainId
      },
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get requests: ${error}`);
    }

    return data;
  }

  // ============================================
  // CHAIN MANAGEMENT ENDPOINTS (ADMIN ONLY)
  // ============================================

  /**
   * Get all chains (admin only)
   */
  async getAllChains(): Promise<{ chains: ChainResponse[]}> {
    const [data, error] = await fetchData(
      `/v2/admin/chains`,
      "GET",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get chains: ${error}`);
    }

    return data;
  }

  /**
   * Get a specific chain by ID (admin only)
   */
  async getChain(chainId: number): Promise<ChainResponse> {
    const [data, error] = await fetchData(
      `/v2/admin/chains/${chainId}`,
      "GET",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to get chain: ${error}`);
    }

    return data;
  }

  /**
   * Create a new chain configuration (admin only)
   */
  async createChain(chainData: {
    chainId: number;
    name: string;
    symbol: string;
    rpcUrl?: string;
    explorerUrl?: string;
    decimals: number;
    enabled?: boolean;
    metadata?: Record<string, any>;
  }): Promise<ChainResponse> {
    const [data, error] = await fetchData(
      `/v2/admin/chains`,
      "POST",
      chainData,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to create chain: ${error}`);
    }

    return data;
  }

  /**
   * Update an existing chain configuration (admin only)
   */
  async updateChain(
    chainId: number,
    updates: {
      name?: string;
      symbol?: string;
      rpcUrl?: string;
      explorerUrl?: string;
      decimals?: number;
      enabled?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    const [data, error] = await fetchData(
      `/v2/admin/chains/${chainId}`,
      "PUT",
      updates,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to update chain: ${error}`);
    }

    return data;
  }

  /**
   * Delete a chain configuration (admin only)
   */
  async deleteChain(chainId: number): Promise<void> {
    const [_, error] = await fetchData(
      `/v2/admin/chains/${chainId}`,
      "DELETE",
      {},
      {},
      {},
      true
    );

    if (error) {
      throw new Error(`Failed to delete chain: ${error}`);
    }
  }
}

export const faucetService = new FaucetService();