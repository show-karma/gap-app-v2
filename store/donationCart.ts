"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DonationCartItem = {
  uid: string;
  title: string;
  slug?: string;
  imageURL?: string;
};

interface DonationCartState {
  items: DonationCartItem[];
  amounts: Record<string, string>; // store as string to preserve user input
  add: (item: DonationCartItem) => void;
  remove: (uid: string) => void;
  toggle: (item: DonationCartItem) => void;
  clear: () => void;
  setAmount: (uid: string, amount: string) => void;
}

export const useDonationCart = create<DonationCartState>()(
  persist(
    (set, get) => ({
      items: [],
      amounts: {},
      add: (item) =>
        set((state) =>
          state.items.find((i) => i.uid === item.uid)
            ? state
            : { items: [...state.items, item] }
        ),
      remove: (uid) =>
        set((state) => ({
          items: state.items.filter((i) => i.uid !== uid),
          amounts: Object.fromEntries(
            Object.entries(state.amounts).filter(([k]) => k !== uid)
          ),
        })),
      toggle: (item) => {
        const exists = get().items.some((i) => i.uid === item.uid);
        if (exists) {
          get().remove(item.uid);
        } else {
          get().add(item);
        }
      },
      clear: () => set({ items: [], amounts: {} }),
      setAmount: (uid, amount) =>
        set((state) => ({ amounts: { ...state.amounts, [uid]: amount } })),
    }),
    {
      name: "donation-cart-storage",
    }
  )
);

