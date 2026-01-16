import { create } from "zustand";

interface OnrampTransaction {
  status: "pending" | "success" | "failed" | "NOT_FOUND" | "unknown";
  purchaseAmount?: string;
  purchaseCurrency?: string;
  paymentTotal?: string;
  paymentCurrency?: string;
  txHash?: string;
  transactionId?: string;
}

interface OnrampStatusModalStore {
  isOpen: boolean;
  isLoading: boolean;
  transaction: OnrampTransaction | null;
  error: string | null;
  openModal: (partnerUserRef: string) => Promise<void>;
  closeModal: () => void;
}

export const useOnrampStatusModalStore = create<OnrampStatusModalStore>((set) => ({
  isOpen: false,
  isLoading: false,
  transaction: null,
  error: null,

  openModal: async (partnerUserRef: string) => {
    set({ isOpen: true, isLoading: true, error: null, transaction: null });
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/onramp/transactions/${encodeURIComponent(partnerUserRef)}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      set({ transaction: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch transaction status",
        isLoading: false,
      });
    }
  },

  closeModal: () => set({ isOpen: false, transaction: null, error: null, isLoading: false }),
}));
