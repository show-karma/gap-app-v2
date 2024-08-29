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

  badges: Badge[] | null;
  setBadges: (badges: Badge[] | null) => void;

  grantUID: string | null;
  setGrantUID: (grantUID: string | null) => void;

  // New Review Related
  badgeScores: number[];
  setBadgeScores: (badgeScores: number[]) => void;
}

export const useReviewStore = create<ReviewStore>((set: any, get: any) => ({
  isOpenReview: ReviewMode.READ,
  setIsOpenReview: (isOpenReview: ReviewMode) => set((state: any) => ({ ...state, isOpenReview })),
  isStarSelected: null,
  setIsStarSelected: (isStarSelected: number | null) =>
    set((state: any) => ({ ...state, isStarSelected })),
  stories: null,
  setStories: (stories: GrantStory[] | null) => set((state: any) => ({ ...state, stories })),
  badges: null,
  setBadges: (badges: Badge[] | null) => set((state: any) => ({ ...state, badges })),
  grantUID: null,
  setGrantUID: (grantUID: string | null) => set((state: any) => ({ ...state, grantUID })),
  badgeScores: [], // TODO: Get lenght of badgesIds and add fill 1 into array based on the lenght or add a toast to advice the user to fill minimum 1 star by badge
  setBadgeScores: (badgeScores: number[]) => set((state: any) => ({ ...state, badgeScores })),
}));
