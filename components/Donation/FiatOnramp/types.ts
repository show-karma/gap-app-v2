import type { Hex } from 'viem';

export interface FiatOnrampModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    uid: string;
    title: string;
    payoutAddress: Hex;
    chainID: number;
  };
  fiatAmount: number;
}
