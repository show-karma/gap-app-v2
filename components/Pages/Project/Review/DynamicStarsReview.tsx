"use client";
import React, { useState } from "react";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { CardReviewMode } from "./CardReview";

interface DynamicStarsReviewProps {
  totalStars: number;
  rating: number;
  setRating: (rating: number) => void;
  mode: CardReviewMode;
}

export const DynamicStarsReview = ({
  totalStars,
  rating,
  setRating,
  mode,
}: DynamicStarsReviewProps) => {
  const [hover, setHover] = useState<number | null>(null);

  const handleStarClick = (index: number) => {
    if (mode == CardReviewMode.WRITE) {
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
                mode === CardReviewMode.WRITE
                  ? "transition-all ease-in-out duration-300 cursor-pointer"
                  : "transition-all ease-in-out duration-300",
              onClick:
                mode === CardReviewMode.WRITE
                  ? () => handleStarClick(currentRating)
                  : undefined,
              style: {
                fill: isHoveredOrRated ? "#004EEB" : "none",
                stroke: isHoveredOrRated ? "#004EEB" : "#98A2B3",
              },
              onMouseEnter:
                mode === CardReviewMode.WRITE
                  ? () => setHover(currentRating)
                  : undefined,
              onMouseLeave:
                mode === CardReviewMode.WRITE
                  ? () => setHover(null)
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
