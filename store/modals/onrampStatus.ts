import { create } from "zustand";
import fetchData from "@/utilities/fetchData";

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

    const [data, error] = await fetchData<OnrampTransaction>(
      `/v2/onramp/transactions/${encodeURIComponent(partnerUserRef)}`,
      "GET",
      {},
      {},
      {},
      false // No auth required for this endpoint
    );

    if (error) {
      set({ error: error, isLoading: false });
    } else {
      set({ transaction: data, isLoading: false });
    }
  },

  closeModal: () => set({ isOpen: false, transaction: null, error: null, isLoading: false }),
}));
