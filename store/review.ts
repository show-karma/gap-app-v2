import { ReviewMode, Badge, GrantStory } from "@/types/review";
import { Hex } from "viem";
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

  /// Used to store the badges of a story
  badges: Badge[] | null;
  setBadges: (badges: Badge[] | null) => void;

  /// The grant UID that is being reviewed at current context
  grantUID: string | null;
  setGrantUID: (grantUID: string | null) => void;

  /// Used to store the badges that are currently active in the Scorer to write a new review
  activeBadges: Badge[] | null;
  setActiveBadges: (activeBadges: Badge[] | null) => void;

  /// Used to store the array of badgeIds that are currently active in the Scorer
  activeBadgeIds: Hex[] | null;
  setActiveBadgeIds: (activeBadgeIds: Hex[] | null) => void;

  // Used to store the array of scores that the user has given to each active badge
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
  activeBadges: null,
  setActiveBadges: (activeBadges: Badge[] | null) =>
    set((state: any) => ({ ...state, activeBadges })),
  activeBadgeIds: null,
  setActiveBadgeIds: (activeBadgeIds: Hex[] | null) =>
    set((state: any) => ({ ...state, activeBadgeIds })),
  badgeScores: [],
  setBadgeScores: (badgeScores: number[]) => set((state: any) => ({ ...state, badgeScores })),
}));
