"use client";

import { useState } from "react";
import { BadgeIcon } from "@/components/Icons/Badge";
import { Button } from "@/components/Utilities/Button";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";
import {
  BadgeDescription,
  Badge,
  BadgeName,
  Review,
  ReviewMode,
} from "@/types/review";
import toast from "react-hot-toast";

const defaultInitialNewReviewList: Badge[] = [
  {
    name: BadgeName.CLEAR_GOALS,
    description: BadgeDescription[BadgeName.CLEAR_GOALS],
    score: 0,
  },
  {
    name: BadgeName.SMOOTH_APPLICATION,
    description: BadgeDescription[BadgeName.SMOOTH_APPLICATION],
    score: 0,
  },
  {
    name: BadgeName.FAIR_ROUNDS,
    description: BadgeDescription[BadgeName.FAIR_ROUNDS],
    score: 0,
  },
  {
    name: BadgeName.EASY_TEACH,
    description: BadgeDescription[BadgeName.EASY_TEACH],
    score: 0,
  },
  {
    name: BadgeName.SUPPORTIVE_TEAM,
    description: BadgeDescription[BadgeName.SUPPORTIVE_TEAM],
    score: 0,
  },
  {
    name: BadgeName.GREAT_REVIEWERS,
    description: BadgeDescription[BadgeName.GREAT_REVIEWERS],
    score: 0,
  },
  {
    name: BadgeName.FAST_DISBURSEMENT,
    description: BadgeDescription[BadgeName.FAST_DISBURSEMENT],
    score: 0,
  },
];

export const CardNewReview = () => {
  const [newReview, setNewReview] = useState<Badge[]>(
    defaultInitialNewReviewList
  );
  const setIsOpenReview = useReviewStore((state) => state.setIsOpenReview);
  const setReview = useReviewStore((state) => state.setReview);
  const setIsStarSelected = useReviewStore((state) => state.setIsStarSelected);
  const review = useReviewStore((state) => state.review);
  const _currentTimestamp = Math.floor(new Date().getTime() / 1000);

  const handleSetRating = (index: number, rating: number) => {
    const updatedBadges = [...newReview];
    updatedBadges[index] = { ...updatedBadges[index], score: rating };
    setNewReview(updatedBadges);
  };

  const handleSubmitReview = () => {
    const totalScore = newReview.reduce(
      (score, review) => score + review.score,
      0
    );
    const averageScore = newReview.length
      ? Number((totalScore / newReview.length).toFixed(1))
      : 0;

    const newReviewData: Review = {
      id: review.length + 1,
      date: _currentTimestamp,
      averageScore: averageScore,
      reviews: newReview,
    };

    setReview([...review, newReviewData]);
    setIsStarSelected(newReviewData.id);
    toast.success("Review submitted successfully!");
    setNewReview(defaultInitialNewReviewList);
    setIsOpenReview(ReviewMode.READ);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {newReview.map((badge: Badge, index: number) => (
          <div key={index} className="flex flex-col w-full px-14 mt-4">
            <div className="flex flex-row w-full items-center gap-3">
              <div>
                <BadgeIcon badgeName={badge.name} className="w-20 h-20" />
              </div>
              <div className="text-sm">{badge.description}</div>
              <div>
                <DynamicStarsReview
                  totalStars={5}
                  rating={badge.score}
                  setRating={(rating) => handleSetRating(index, rating)}
                  mode={ReviewMode.WRITE}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end w-full">
        <Button onClick={handleSubmitReview}>Submit Review</Button>
      </div>
    </div>
  );
};
