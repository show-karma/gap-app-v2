import fetchData from "@/utilities/fetchData";
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

    const [response, error] = await fetchData<UpdateChainPayoutAddressResponse>(
      INDEXER.PROJECT.CHAIN_PAYOUT_ADDRESS.UPDATE(projectId),
      "PUT",
      payload
    );

    if (error) {
      throw new Error(error);
    }

    return response?.chainPayoutAddress ?? null;
  },
};
