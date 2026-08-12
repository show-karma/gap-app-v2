import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import type {
  ChainPayoutAddressMap,
  UpdateChainPayoutAddressRequest,
  UpdateChainPayoutAddressResponse,
} from "../types/chain-payout-address";

/**
 * Service for managing chain-specific payout addresses
 */
export const chainPayoutAddressService = {
  /**
   * Update chain payout addresses for a project
   *
   * @param projectId - Project UID or slug
   * @param chainPayoutAddresses - Map of chain IDs to addresses (null to remove)
   * @returns Updated chain payout address map
   * @throws Error if the API request fails
   */
  async update(
    projectId: string,
    chainPayoutAddresses: Record<string, string | null>
  ): Promise<ChainPayoutAddressMap | null> {
    const payload: UpdateChainPayoutAddressRequest = { chainPayoutAddresses };

    // TODO(#1775): add zod schema
    const response = await api.put<UpdateChainPayoutAddressResponse>(
      INDEXER.PROJECT.CHAIN_PAYOUT_ADDRESS.UPDATE(projectId),
      payload
    );

    return response?.chainPayoutAddress ?? null;
  },
};
