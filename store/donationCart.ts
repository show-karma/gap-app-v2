"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupportedToken } from "@/constants/supportedTokens";

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

interface DonationCartState {
  items: DonationCartItem[];
  amounts: Record<string, string>; // projectId -> amount
  selectedTokens: Record<string, SupportedToken>; // projectId -> selected token
  payments: DonationPayment[]; // final payment configuration
  add: (item: DonationCartItem) => void;
  remove: (uid: string) => void;
  toggle: (item: DonationCartItem) => void;
  clear: () => void;
  setAmount: (uid: string, amount: string) => void;
  setSelectedToken: (projectId: string, token: SupportedToken) => void;
  getPaymentForProject: (projectId: string) => DonationPayment | undefined;
  updatePayments: () => void; // sync payments array with current state
}

export const useDonationCart = create<DonationCartState>()(
  persist(
    (set, get) => ({
      items: [],
      amounts: {},
      selectedTokens: {},
      payments: [],
      add: (item) =>
        set((state) =>
          state.items.find((i) => i.uid === item.uid)
            ? state
            : { items: [...state.items, item] }
        ),
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
        const exists = get().items.some((i) => i.uid === item.uid);
        if (exists) {
          get().remove(item.uid);
        } else {
          get().add(item);
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
    }),
    {
      name: "donation-cart-storage",
    }
  )
);

