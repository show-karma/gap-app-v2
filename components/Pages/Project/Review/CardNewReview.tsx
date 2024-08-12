"use client";

import { BadgeIcon } from "@/components/Icons/Badge";
import { Button } from "@/components/Utilities/Button";
import React from "react";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { BadgeListProps, CardReviewMode } from "./CardReview";
import { useReviewStore } from "@/store/review";

export const CardNewReview = ({ id }: { id: number }) => {
  const setNewReview = useReviewStore((state) => state.setNewReview);
  const newReview = useReviewStore((state) => state.newReview);

  const handleSetRating = (index: number, rating: number) => {
    const updatedBadges = [...newReview];
    updatedBadges[index] = { ...updatedBadges[index], score: rating };
    setNewReview(updatedBadges);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {newReview.map((badge: BadgeListProps, index: number) => (
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
                  mode={CardReviewMode.WRITE}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end w-full">
        <Button>Submit Review</Button>
      </div>
    </div>
  );
};
