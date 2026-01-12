import type { SupportedToken } from "@/constants/supportedTokens";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";
import type { PaymentMethod } from "@/types/donations";

export interface SingleProjectDonationState {
  projectId: string;
  selectedToken: SupportedToken | null;
  amount: string;
  paymentMethod: PaymentMethod;
}

export interface SingleProjectDonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    uid: string;
    title: string;
    chainPayoutAddress?: ChainPayoutAddressMap;
    imageURL?: string;
    chainID?: number;
  };
}

export interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}
