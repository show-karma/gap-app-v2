"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupportedToken } from "@/constants/supportedTokens";
import { DONATION_CONSTANTS, isCartFull, isCartSizeWarning } from "@/constants/donation";

export type DonationCartItem = {
  uid: string;
  title: string;
  slug?: string;
  imageURL?: string;
};

export type DonationPayment = {
  projectId: string;
  amount: string;
  token: SupportedToken;
  chainId: number;
};

export type CompletedDonation = {
  projectId: string;
  projectTitle: string;
  projectSlug?: string;
  projectImageURL?: string;
  amount: string;
  token: SupportedToken;
  chainId: number;
  transactionHash: string;
  timestamp: number;
  status: "success" | "failed";
};

export type DonationSession = {
  id: string;
  timestamp: number;
  donations: CompletedDonation[];
  totalProjects: number;
};

interface DonationCartState {
  items: DonationCartItem[];
  amounts: Record<string, string>; // projectId -> amount
  selectedTokens: Record<string, SupportedToken>; // projectId -> selected token
  payments: DonationPayment[]; // final payment configuration
  lastCompletedSession: DonationSession | null; // track last completed donation session
  add: (item: DonationCartItem) => boolean; // returns false if cart is full
  remove: (uid: string) => void;
  toggle: (item: DonationCartItem) => boolean; // returns false if cart is full
  clear: () => void;
  setAmount: (uid: string, amount: string) => void;
  setSelectedToken: (projectId: string, token: SupportedToken) => void;
  getPaymentForProject: (projectId: string) => DonationPayment | undefined;
  updatePayments: () => void; // sync payments array with current state
  isCartFull: () => boolean;
  isCartWarning: () => boolean;
  getCartSize: () => number;
  setLastCompletedSession: (session: DonationSession) => void;
  clearLastCompletedSession: () => void;
}

export const useDonationCart = create<DonationCartState>()(
  persist(
    (set, get) => ({
      items: [],
      amounts: {},
      selectedTokens: {},
      payments: [],
      lastCompletedSession: null,
      add: (item) => {
        const state = get();

        // Check if item already exists
        if (state.items.find((i) => i.uid === item.uid)) {
          return true; // Already in cart, success
        }

        // Check if cart is full
        if (state.items.length >= DONATION_CONSTANTS.MAX_CART_SIZE) {
          return false; // Cart is full, cannot add
        }

        set({ items: [...state.items, item] });
        return true; // Successfully added
      },
      remove: (uid) =>
        set((state) => {
          const newAmounts = { ...state.amounts };
          const newSelectedTokens = { ...state.selectedTokens };
          delete newAmounts[uid];
          delete newSelectedTokens[uid];
          
          return {
            items: state.items.filter((i) => i.uid !== uid),
            amounts: newAmounts,
            selectedTokens: newSelectedTokens,
            payments: state.payments.filter((p) => p.projectId !== uid),
          };
        }),
      toggle: (item) => {
        const state = get();
        const exists = state.items.some((i) => i.uid === item.uid);

        if (exists) {
          state.remove(item.uid);
          return true; // Successfully removed
        } else {
          return state.add(item); // Returns true if added, false if cart full
        }
      },
      clear: () => set({ 
        items: [], 
        amounts: {}, 
        selectedTokens: {},
        payments: []
      }),
      setAmount: (uid, amount) =>
        set((state) => ({ amounts: { ...state.amounts, [uid]: amount } })),
      setSelectedToken: (projectId, token) =>
        set((state) => ({ 
          selectedTokens: { ...state.selectedTokens, [projectId]: token }
        })),
      getPaymentForProject: (projectId) => {
        const state = get();
        return state.payments.find((p) => p.projectId === projectId);
      },
      updatePayments: () => {
        const state = get();
        const newPayments: DonationPayment[] = [];

        state.items.forEach((item) => {
          const amount = state.amounts[item.uid];
          const token = state.selectedTokens[item.uid];

          if (amount && token && parseFloat(amount) > 0) {
            newPayments.push({
              projectId: item.uid,
              amount,
              token,
              chainId: token.chainId,
            });
          }
        });

        set({ payments: newPayments });
      },
      isCartFull: () => {
        const state = get();
        return isCartFull(state.items.length);
      },
      isCartWarning: () => {
        const state = get();
        return isCartSizeWarning(state.items.length);
      },
      getCartSize: () => {
        const state = get();
        return state.items.length;
      },
      setLastCompletedSession: (session) => {
        set({ lastCompletedSession: session });
      },
      clearLastCompletedSession: () => {
        set({ lastCompletedSession: null });
      },
    }),
    {
      name: "donation-cart-storage",
    }
  )
);

