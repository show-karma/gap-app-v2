import { z } from "zod";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

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

export interface FaucetRequestResponse {
  requestId: string;
  eligible: boolean;
  gasUnits: string;
  gasPrice: string;
  totalAmount: string;
  expiresAt: Date;
  faucetAddress: string;
}

// FaucetClaimResponse has no ambiguous Date-typed fields, so it is safe to
// validate at runtime.
const FaucetClaimResponseSchema = z
  .object({
    requestId: z.string(),
    transactionHash: z.string(),
    status: z.string(),
    blockNumber: z.string().optional(),
    gasUsed: z.string().optional(),
  })
  .passthrough();
export type FaucetClaimResponse = z.infer<typeof FaucetClaimResponseSchema>;

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
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
export interface FaucetRequests {
  payload: FaucetRequest[];
  pagination: PaginatedResponse;
}

export interface WhitelistedPaginatedResponse {
  data: WhitelistedContract[];
  pagination: PaginatedResponse;
}

export interface BlockedPaginatedResponse {
  data: BlockedAddress[];
  pagination: PaginatedResponse;
}

// FaucetBalance has no ambiguous Date-typed fields, so it is safe to
// validate at runtime.
const FaucetBalanceSchema = z
  .object({
    chainId: z.number(),
    chainName: z.string(),
    balance: z.string(),
    symbol: z.string(),
    isLow: z.boolean(),
    threshold: z.string(),
  })
  .passthrough();
export type FaucetBalance = z.infer<typeof FaucetBalanceSchema>;

const AllFaucetBalancesResponseSchema = z
  .object({ balances: z.array(FaucetBalanceSchema) })
  .passthrough();

const FaucetStatsSchema = z
  .object({
    totalRequests: z.number(),
    successfulClaims: z.number(),
    failedClaims: z.number(),
    totalAmountDistributed: z.string(),
    uniqueAddresses: z.number(),
  })
  .passthrough();
export type FaucetStats = z.infer<typeof FaucetStatsSchema>;

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

// ChainResponse has no ambiguous Date-typed fields (createdAt/updatedAt are
// already strings), so it is safe to validate at runtime.
const ChainResponseSchema = z
  .object({
    chainId: z.number(),
    createdAt: z.string(),
    decimals: z.number(),
    explorerUrl: z.number().optional(),
    id: z.string(),
    metadata: z.any(),
    name: z.string(),
    rpcUrl: z.string().optional(),
    symbol: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export type ChainResponse = z.infer<typeof ChainResponseSchema>;

const AllChainsResponseSchema = z.object({ chains: z.array(ChainResponseSchema) }).passthrough();

const ExpireOldRequestsResponseSchema = z.object({ count: z.number() }).passthrough();

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
    // TODO(#1775): add zod schema
    return api.post<FaucetEligibilityResponse>(
      `/v2/faucet/check-eligibility/${chainId}`,
      { walletAddress, transaction },
      { isAuthorized: false }
    );
  }

  /**
   * Create a new faucet request
   */
  async createRequest(
    chainId: number,
    walletAddress: string,
    transaction: FaucetTransaction
  ): Promise<FaucetRequestResponse> {
    // TODO(#1775): add zod schema
    return api.post<FaucetRequestResponse>(
      `/v2/faucet/request`,
      { chainId, walletAddress, transaction },
      { isAuthorized: false }
    );
  }

  /**
   * Claim faucet funds for a pending request
   */
  async claimFaucet(requestId: string): Promise<FaucetClaimResponse> {
    return api.post<FaucetClaimResponse>(
      `/v2/faucet/claim`,
      { requestId },
      { isAuthorized: false, schema: FaucetClaimResponseSchema }
    );
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
    const params: Record<string, unknown> = {
      address,
      page,
      limit,
    };

    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    // TODO(#1775): add zod schema
    return api.get<{ requests: FaucetRequest[]; pageInfo: any }>(`/v2/faucet/history`, {
      params,
      isAuthorized: false,
    });
  }

  /**
   * Get faucet statistics
   */
  async getStats(chainId?: number, days: number = 7): Promise<FaucetStats> {
    const params: Record<string, unknown> = {
      days,
    };

    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    return api.get<FaucetStats>(`/v2/faucet/stats`, {
      params,
      isAuthorized: false,
      schema: FaucetStatsSchema,
    });
  }

  /**
   * Get faucet balance for a specific chain
   */
  async getBalance(chainId: number): Promise<FaucetBalance> {
    return api.get<FaucetBalance>(`/v2/faucet/balance/${chainId}`, {
      isAuthorized: false,
      schema: FaucetBalanceSchema,
    });
  }

  /**
   * Get faucet balances for all chains
   */
  async getAllBalances(): Promise<{ balances: FaucetBalance[] }> {
    return api.get<{ balances: FaucetBalance[] }>(`/v2/faucet/balances`, {
      isAuthorized: false,
      schema: AllFaucetBalancesResponseSchema,
    });
  }

  /**
   * Get a specific faucet request by ID
   */
  async getRequest(requestId: string): Promise<FaucetRequest | null> {
    try {
      // TODO(#1775): add zod schema
      return await api.get<FaucetRequest>(`/v2/faucet/request/${requestId}`, {
        isAuthorized: false,
      });
    } catch (e) {
      // 404 means request not found
      if (e instanceof HttpError && e.status === 404) {
        return null;
      }
      throw e;
    }
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
    };
    faucetAddress: string;
    totalChains: string;
    enabledChains: string;
  }> {
    // TODO(#1775): add zod schema
    return api.get(`/v2/admin/faucet/config`);
  }

  /**
   * Update chain-specific faucet settings (admin only)
   */
  async updateChainSettings(
    chainId: number,
    settings: Partial<FaucetChainSettings>
  ): Promise<void> {
    await api.put(`/v2/admin/faucet/settings/${chainId}`, settings);
  }

  /**
   * Create faucet settings for a chain (admin only)
   */
  async createChainSettings(settings: FaucetChainSettings): Promise<FaucetChainSettings> {
    // TODO(#1775): add zod schema
    return api.post<FaucetChainSettings>(`/v2/admin/faucet/settings`, settings);
  }

  /**
   * Delete faucet settings for a chain (admin only)
   */
  async deleteChainSettings(chainId: number): Promise<void> {
    await api.delete(`/v2/admin/faucet/settings/${chainId}`);
  }

  /**
   * Update global faucet configuration (admin only)
   */
  async updateGlobalConfig(config: Partial<FaucetGlobalConfig>): Promise<void> {
    await api.put(`/v2/admin/faucet/global-config`, config);
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
    await api.post(`/v2/admin/faucet/whitelist`, contract);
  }

  /**
   * Remove contract from whitelist (admin only)
   */
  async removeFromWhitelist(chainId: number, contractAddress: string): Promise<void> {
    await api.delete(`/v2/admin/faucet/whitelist/${chainId}/${contractAddress}`);
  }

  /**
   * Get whitelisted contracts (admin only)
   */
  async getWhitelistedContracts(chainId?: number): Promise<WhitelistedPaginatedResponse> {
    const params: Record<string, unknown> = {};
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    // TODO(#1775): add zod schema
    return api.get<WhitelistedPaginatedResponse>(`/v2/admin/faucet/whitelist`, { params });
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
    const payload: Record<string, unknown> = {
      address,
      reason,
    };

    if (chainId !== undefined) {
      payload.chainId = chainId;
    }

    if (expiresAt) {
      payload.expiresAt = expiresAt;
    }

    await api.post(`/v2/admin/faucet/block`, payload);
  }

  /**
   * Unblock an address (admin only)
   */
  async unblockAddress(address: string, chainId?: number): Promise<void> {
    const params: Record<string, unknown> = {};
    if (chainId !== undefined) {
      params.chainId = chainId;
    }

    await api.delete(`/v2/admin/faucet/block/${address}`, { params });
  }

  /**
   * Get blocked addresses (admin only)
   */
  async getBlockedAddresses(): Promise<BlockedPaginatedResponse> {
    // TODO(#1775): add zod schema
    return api.get<BlockedPaginatedResponse>(`/v2/admin/faucet/blocked`);
  }

  /**
   * Emergency stop - disable faucet for a chain (admin only)
   */
  async emergencyStop(chainId: number): Promise<void> {
    await api.post(`/v2/admin/faucet/emergency-stop/${chainId}`);
  }

  /**
   * Resume faucet operations for a chain (admin only)
   */
  async resumeOperations(chainId: number): Promise<void> {
    await api.post(`/v2/admin/faucet/resume/${chainId}`);
  }

  /**
   * Expire old pending requests (admin only)
   */
  async expireOldRequests(): Promise<{ count: number }> {
    return api.post<{ count: number }>(
      `/v2/admin/faucet/expire`,
      {},
      { schema: ExpireOldRequestsResponseSchema }
    );
  }

  /**
   * Get pending requests (admin only)
   */
  async getRequests({
    page = 1,
    limit = 10,
    status,
    offset = 0,
    chainId,
  }: {
    page: number;
    limit: number;
    status?: "PENDING" | "FAILED" | "CLAIMED" | "EXPIRED";
    offset?: number;
    chainId?: number;
  }): Promise<FaucetRequests> {
    // TODO(#1775): add zod schema
    return api.get<FaucetRequests>(`/v2/admin/faucet/requests`, {
      params: {
        page,
        limit,
        status,
        offset,
        chainId,
      },
    });
  }

  // ============================================
  // CHAIN MANAGEMENT ENDPOINTS (ADMIN ONLY)
  // ============================================

  /**
   * Get all chains (admin only)
   */
  async getAllChains(): Promise<{ chains: ChainResponse[] }> {
    return api.get<{ chains: ChainResponse[] }>(`/v2/admin/chains`, {
      schema: AllChainsResponseSchema,
    });
  }

  /**
   * Get a specific chain by ID (admin only)
   */
  async getChain(chainId: number): Promise<ChainResponse> {
    return api.get<ChainResponse>(`/v2/admin/chains/${chainId}`, {
      schema: ChainResponseSchema,
    });
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
    return api.post<ChainResponse>(`/v2/admin/chains`, chainData, {
      schema: ChainResponseSchema,
    });
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
    // TODO(#1775): add zod schema
    return api.put<any>(`/v2/admin/chains/${chainId}`, updates);
  }

  /**
   * Delete a chain configuration (admin only)
   */
  async deleteChain(chainId: number): Promise<void> {
    await api.delete(`/v2/admin/chains/${chainId}`);
  }
}

export const faucetService = new FaucetService();
