import type { Hex } from 'viem';
import type { SupportedToken } from '@/constants/supportedTokens';
import { PaymentMethod } from '@/types/donations';

export interface SingleProjectDonationState {
  projectId: string;
  selectedToken: SupportedToken | null;
  amount: string;
  paymentMethod: PaymentMethod;
}

export interface DonateButtonProps {
  projectId: string;
  projectTitle: string;
  payoutAddress: Hex;
  chainID?: number;
  className?: string;
}

export interface SingleProjectDonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    uid: string;
    title: string;
    payoutAddress: Hex | string | Record<string, string>;
    imageURL?: string;
    chainID?: number;
  };
}

export interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}
