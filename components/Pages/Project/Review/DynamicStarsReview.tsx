"use client";

import { useState } from "react";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { ReviewMode } from "@/types/review";

interface DynamicStarsReviewProps {
  totalStars: number;
  rating: number;
  setRating: (rating: number) => void;
  mode: ReviewMode;
}

export const DynamicStarsReview = ({
  totalStars,
  rating,
  setRating,
  mode,
}: DynamicStarsReviewProps) => {
  const [hover, setHover] = useState<number | null>(null);

  const handleStarClick = (index: number) => {
    if (mode == ReviewMode.WRITE) {
      setRating(index);
    }
  };

  return (
    <div className="flex">
      {[...Array(totalStars)].map((_, index) => {
        const currentRating = index + 1;
        const isHoveredOrRated = currentRating <= (hover || rating || 0);

        return (
          <StarReviewIcon
            key={index}
            pathProps={{
              className:
                mode === ReviewMode.WRITE
                  ? "transition-all ease-in-out duration-300 cursor-pointer"
                  : "transition-all ease-in-out duration-300",
              onClick:
                mode === ReviewMode.WRITE
                  ? () => handleStarClick(currentRating)
                  : undefined,
              style: {
                fill: isHoveredOrRated ? "#004EEB" : "none",
                stroke: isHoveredOrRated ? "#004EEB" : "#98A2B3",
              },
              onMouseEnter:
                mode === ReviewMode.WRITE
                  ? () => setHover(currentRating)
                  : undefined,
              onMouseLeave:
                mode === ReviewMode.WRITE ? () => setHover(null) : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
