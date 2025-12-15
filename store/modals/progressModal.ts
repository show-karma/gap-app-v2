import { create } from "zustand";

export type ProgressModalStatus = "loading" | "success" | "error";

interface ProgressModalStore {
  isOpen: boolean;
  status: ProgressModalStatus;
  message: string;

  showLoading: (message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  close: () => void;
}

export const useProgressModal = create<ProgressModalStore>((set) => ({
  isOpen: false,
  status: "loading",
  message: "",

  showLoading: (message: string) => {
    set({ isOpen: true, status: "loading", message });
  },

  showSuccess: (message: string) => {
    set({ status: "success", message });
  },

  showError: (message: string) => {
    set({ status: "error", message });
  },

  close: () => {
    set({ isOpen: false, status: "loading", message: "" });
  },
}));
