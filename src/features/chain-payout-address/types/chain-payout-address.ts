/**
 * Chain-specific payout address types
 *
 * Used for managing per-chain wallet addresses where project owners
 * can receive donations on different blockchain networks.
 */

/**
 * Map of chain ID to wallet address
 * Example: { "10": "0x...", "42161": "0x..." }
 */
export type ChainPayoutAddressMap = Record<string, string>;

/**
 * API request payload for updating chain payout addresses
 */
export interface UpdateChainPayoutAddressRequest {
  /** Map of chain IDs to addresses. Set address to null to remove. */
  chainPayoutAddresses: Record<string, string | null>;
}

/**
 * API response after updating chain payout addresses
 */
export interface UpdateChainPayoutAddressResponse {
  chainPayoutAddress: ChainPayoutAddressMap | null;
}

/**
 * Form state for a single chain's payout address
 */
export interface ChainPayoutAddressFormEntry {
  chainId: number;
  chainName: string;
  address: string;
  isEnabled: boolean;
}

/**
 * Props for the SetChainPayoutAddressModal component
 */
export interface SetChainPayoutAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentAddresses?: ChainPayoutAddressMap;
  onSuccess?: (addresses: ChainPayoutAddressMap) => void;
}

/**
 * Props for the EnableDonationsButton component
 */
export interface EnableDonationsButtonProps {
  projectId: string;
  currentAddresses?: ChainPayoutAddressMap;
  onSuccess?: (addresses: ChainPayoutAddressMap) => void;
}
