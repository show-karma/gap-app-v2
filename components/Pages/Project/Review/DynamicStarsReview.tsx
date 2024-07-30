"use client";
import React, { useState } from "react";
import { StarReviewIcon } from "@/components/Icons/StarReview";

interface DynamicStarsReviewProps {
  totalStars: number;
  rating: number;
  setRating: (rating: number) => void;
  editableReview: boolean;
}

export const DynamicStarsReview = ({
  totalStars,
  rating,
  setRating,
  editableReview,
}: DynamicStarsReviewProps) => {
  const [hover, setHover] = useState<number | null>(null);

  const handleStarClick = (index: number) => {
    if (editableReview) {
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
              className: editableReview
                ? "transition-all ease-in-out duration-300 cursor-pointer"
                : "transition-all ease-in-out duration-300",
              onClick: editableReview
                ? () => handleStarClick(currentRating)
                : undefined,
              style: {
                fill: isHoveredOrRated ? "#004EEB" : "none",
                stroke: isHoveredOrRated ? "#004EEB" : "#98A2B3",
              },
              onMouseEnter: editableReview
                ? () => setHover(currentRating)
                : undefined,
              onMouseLeave: editableReview ? () => setHover(null) : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
