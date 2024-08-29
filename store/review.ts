import {
  Review,
  Badge,
  BadgeName,
  BadgeDescription,
  ReviewMode,
  BadgeOfficial,
  GrantStory,
} from "@/types/review";
import { create } from "zustand";

// TODO: Mock - Should remove this.
const grantStoryMockData: GrantStory[] = [
  {
    timestamp: 1620414884, // 07 May, 2021 in Unix timestamp,
    txUID: "0x7681b353ede51eadfbf7165c592a8449808ef4f37999cd9c819cb29dc923ad1a",
    badgeIds: ["1", "2", "3", "4", "5", "6", "7"],
    badgeScores: [5, 4, 3, 2, 1, 2, 3],
    averageScore: 3.3,
  },
  {
    timestamp: 1620414884, // 07 May, 2021 in Unix timestamp,
    txUID: "0x7681b353ede51eadfbf7165c592a8449808ef4f37999cd9c819cb29dc923ad1a",
    badgeIds: ["1", "2", "3", "4", "5", "6", "7"],
    badgeScores: [5, 5, 5, 5, 1, 4, 4],
    averageScore: 0,
  },
];

interface ReviewStore {
  // Mocks
  review: Review[];
  setReview: (review: Review[]) => void;

  /// UI
  isOpenReview: ReviewMode;
  setIsOpenReview: (isOpenReview: ReviewMode) => void;
  isStarSelected: number | null;
  setIsStarSelected: (isStarSelected: number | null) => void;

  /// This are setters used by the blockchain calls
  stories: GrantStory[];
  setStories: (stories: GrantStory[]) => void;
  badge: BadgeOfficial[] | null;
  setBadge: (badge: BadgeOfficial[] | null) => void;

  grantUID: string | null;
  setGrantUID: (grantUID: string | null) => void;
  badgeScore: number[];
  setBadgeScore: (badgeScore: number[]) => void;
}

// TODO: Mock - Should remove this.
const initialBadgeList: Badge[][] = [
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 5,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 4,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 4,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 4,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 4,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 3,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 5,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 1,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 1,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 3,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 4,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 2,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 3,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 1,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 3,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 1,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 1,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 2,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 1,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 1,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 2,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 3,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 3,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 2,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 5,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 4,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 3,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 5,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 4,
    },
  ],
  [
    {
      name: BadgeName.CLEAR_GOALS,
      description: BadgeDescription[BadgeName.CLEAR_GOALS],
      score: 2,
    },
    {
      name: BadgeName.SMOOTH_APPLICATION,
      description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
      score: 2,
    },
    {
      name: BadgeName.FAIR_ROUNDS,
      description: BadgeDescription[BadgeName.FAIR_ROUNDS],
      score: 1,
    },
    {
      name: BadgeName.EASY_TEACH,
      description: BadgeDescription[BadgeName.EASY_TEACH],
      score: 5,
    },
    {
      name: BadgeName.SUPPORTIVE_TEAM,
      description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
      score: 5,
    },
    {
      name: BadgeName.GREAT_REVIEWERS,
      description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
      score: 4,
    },
    {
      name: BadgeName.FAST_DISBURSEMENT,
      description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
      score: 4,
    },
  ],
];

// TODO: Mock - Should remove this.
const defaultReviews: Review[] = [
  {
    id: 0,
    date: 1620414884, // 07 May, 2021 in Unix timestamp
    averageScore: 4.6,
    reviews: initialBadgeList[0],
  },
  {
    id: 1,
    date: 1673723684, // 14 January, 2023 in Unix timestamp
    averageScore: 4.4,
    reviews: initialBadgeList[1],
  },
  {
    id: 2,
    date: 1498072484, // 21 Jun 2017 in Unix timestamp
    averageScore: 4.1,
    reviews: initialBadgeList[2],
  },
  {
    id: 3,
    date: 1351188884, // 25 Oct 2012 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[3],
  },
  {
    id: 4,
    date: 1719792000, // 1 July, 2024 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[4],
  },
  {
    id: 5,
    date: 1672531200, // 1 January, 2023 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[5],
  },
  {
    id: 6,
    date: 1356998400, // 1 January, 2013 in Unix timestamp
    averageScore: 4.9,
    reviews: initialBadgeList[6],
  },
];

export const useReviewStore = create<ReviewStore>((set, get) => ({
  review: defaultReviews,
  setReview: (review: Review[]) => set((state) => ({ ...state, review })),
  isOpenReview: ReviewMode.READ,
  setIsOpenReview: (isOpenReview: ReviewMode) =>
    set((state) => ({ ...state, isOpenReview })),
  isStarSelected: null,
  setIsStarSelected: (isStarSelected: number | null) =>
    set((state) => ({ ...state, isStarSelected })),
  stories: grantStoryMockData,
  setStories: (stories: GrantStory[]) =>
    set((state) => ({ ...state, stories })),
  badge: null,
  setBadge: (badge: BadgeOfficial[] | null) =>
    set((state) => ({ ...state, badge })),
  grantUID: null,
  setGrantUID: (grantUID: string | null) =>
    set((state) => ({ ...state, grantUID })),
  badgeScore: [], // TODO: Get lenght of badgesIds and add fill 1 into array based on the lenght or add a toast to advice the user to fill minimum 1 star by badge
  setBadgeScore: (badgeScore: number[]) =>
    set((state) => ({ ...state, badgeScore })),
}));
