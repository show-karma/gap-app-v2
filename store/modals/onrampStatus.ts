import { create } from "zustand";
import fetchData from "@/utilities/fetchData";

type OnrampProvider = "coinbase" | "stripe" | "transak";

interface OnrampTransaction {
  status: "pending" | "success" | "failed" | "NOT_FOUND" | "unknown";
  purchaseAmount?: string;
  purchaseCurrency?: string;
  paymentTotal?: string;
  paymentCurrency?: string;
  txHash?: string;
  txLink?: string; // Explorer URL for the transaction
  transactionId?: string;
  network?: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
}

interface OnrampStatusModalStore {
  isOpen: boolean;
  isLoading: boolean;
  transaction: OnrampTransaction | null;
  error: string | null;
  provider: OnrampProvider | null;
  orderId: string | null;
  openModal: (provider: OnrampProvider, orderId: string) => Promise<void>;
  retry: () => Promise<void>;
  closeModal: () => void;
}

export const useOnrampStatusModalStore = create<OnrampStatusModalStore>((set, get) => ({
  isOpen: false,
  isLoading: false,
  transaction: null,
  error: null,
  provider: null,
  orderId: null,

  openModal: async (provider: OnrampProvider, orderId: string) => {
    set({ isOpen: true, isLoading: true, error: null, transaction: null, provider, orderId });

    const [data, error] = await fetchData<OnrampTransaction>(
      `/v2/onramp/transactions/${encodeURIComponent(provider)}/${encodeURIComponent(orderId)}`,
      "GET",
      {},
      {},
      {},
      false // No auth required for this endpoint
    );

    if (error) {
      set({ error: error, isLoading: false });
    } else if (data) {
      set({ transaction: data, isLoading: false });
    } else {
      set({ error: "No transaction data received", isLoading: false });
    }
  },

  retry: async () => {
    const { provider, orderId } = get();
    if (provider && orderId) {
      await get().openModal(provider, orderId);
    }
  },

  closeModal: () =>
    set({
      isOpen: false,
      transaction: null,
      error: null,
      isLoading: false,
      provider: null,
      orderId: null,
    }),
}));
