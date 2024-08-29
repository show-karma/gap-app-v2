import { ReviewMode, Badge, GrantStory } from "@/types/review";
import { create } from "zustand";

interface ReviewStore {
  /// UI
  isOpenReview: ReviewMode;
  setIsOpenReview: (isOpenReview: ReviewMode) => void;
  isStarSelected: number | null;
  setIsStarSelected: (isStarSelected: number | null) => void;

  /// This are setters used by the blockchain calls
  stories: GrantStory[] | null;
  setStories: (stories: GrantStory[] | null) => void;

  badge: Badge[] | null;
  setBadge: (badge: Badge[] | null) => void;

  grantUID: string | null;
  setGrantUID: (grantUID: string | null) => void;

  // New Review Related
  badgeScore: number[];
  setBadgeScore: (badgeScore: number[]) => void;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  isOpenReview: ReviewMode.READ,
  setIsOpenReview: (isOpenReview: ReviewMode) =>
    set((state) => ({ ...state, isOpenReview })),
  isStarSelected: null,
  setIsStarSelected: (isStarSelected: number | null) =>
    set((state) => ({ ...state, isStarSelected })),
  stories: null,
  setStories: (stories: GrantStory[] | null) =>
    set((state) => ({ ...state, stories })),
  badge: null,
  setBadge: (badge: Badge[] | null) => set((state) => ({ ...state, badge })),
  grantUID: null,
  setGrantUID: (grantUID: string | null) =>
    set((state) => ({ ...state, grantUID })),
  badgeScore: [], // TODO: Get lenght of badgesIds and add fill 1 into array based on the lenght or add a toast to advice the user to fill minimum 1 star by badge
  setBadgeScore: (badgeScore: number[]) =>
    set((state) => ({ ...state, badgeScore })),
}));
