"use client";

import { create } from "zustand";

interface KarmaSeedsModalStore {
  // Launch modal state
  isLaunchModalOpen: boolean;
  setLaunchModalOpen: (isOpen: boolean) => void;
  openLaunchModal: () => void;
  closeLaunchModal: () => void;

  // Buy modal state
  isBuyModalOpen: boolean;
  setBuyModalOpen: (isOpen: boolean) => void;
  openBuyModal: () => void;
  closeBuyModal: () => void;

  // Form defaults (set from project data)
  defaultTokenName: string;
  defaultTokenSymbol: string;
  setDefaults: (projectName: string) => void;
}

/**
 * Generate token name from project name
 * e.g., "My Project" -> "KSEED-My Project"
 */
function generateTokenName(projectName: string): string {
  return `KSEED-${projectName.slice(0, 24)}`;
}

/**
 * Generate token symbol from project name
 * Takes first letters of each word, max 6 chars
 * e.g., "My Project" -> "KSEED-MP"
 */
function generateTokenSymbol(projectName: string): string {
  const initials = projectName
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4);
  return `KS-${initials}`;
}

export const useKarmaSeedsModalStore = create<KarmaSeedsModalStore>((set) => ({
  // Launch modal
  isLaunchModalOpen: false,
  setLaunchModalOpen: (isOpen) => set({ isLaunchModalOpen: isOpen }),
  openLaunchModal: () => set({ isLaunchModalOpen: true }),
  closeLaunchModal: () => set({ isLaunchModalOpen: false }),

  // Buy modal
  isBuyModalOpen: false,
  setBuyModalOpen: (isOpen) => set({ isBuyModalOpen: isOpen }),
  openBuyModal: () => set({ isBuyModalOpen: true }),
  closeBuyModal: () => set({ isBuyModalOpen: false }),

  // Form defaults
  defaultTokenName: "",
  defaultTokenSymbol: "",
  setDefaults: (projectName: string) => {
    set({
      defaultTokenName: generateTokenName(projectName),
      defaultTokenSymbol: generateTokenSymbol(projectName),
    });
  },
}));
