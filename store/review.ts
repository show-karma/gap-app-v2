import {
  Review,
  Badge,
  BadgeName,
  BadgeDescription,
  ReviewMode,
} from "@/types/review";
import { create } from "zustand";

interface ReviewStore {
  review: Review[];
  setReview: (review: Review[]) => void;
  badgeList: Badge[][];
  setBadgeList: (badgeList: Badge[][]) => void;
  isOpenReview: ReviewMode;
  setIsOpenReview: (isOpenReview: ReviewMode) => void;
}

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
  badgeList: initialBadgeList,
  setBadgeList: (badgeList: Badge[][]) =>
    set((state) => ({ ...state, badgeList })),
  isOpenReview: ReviewMode.READ,
  setIsOpenReview: (isOpenReview: ReviewMode) =>
    set((state) => ({ ...state, isOpenReview })),
}));
