import { StarIcon } from "@/components/Icons/Star";
import type { FC } from "react";
import React, { useState } from "react";

interface DynamicStarsProps {
  totalStars?: number;
  rating?: number | undefined;
  setRating: (rating: number | undefined) => void;
}

export const DynamicStars: FC<DynamicStarsProps> = ({
  totalStars = 10,
  rating,
  setRating,
}) => {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={"DynamicStars flex flex-row gap-2"}>
      {[...Array(totalStars)].map((star, index) => {
        const currentRating = index + 1;

        return (
          <label key={+index}>
            <input
              key={star}
              type="radio"
              name="rating"
              value={currentRating}
              onChange={() => setRating(currentRating)}
              className="star-radio hidden"
            />

            <StarIcon
              pathProps={{
                className:
                  "transition-all ease-in-out duration-300 cursor-pointer",
                style: {
                  fill:
                    currentRating <= (hover || rating || 0)
                      ? "#004EEB"
                      : "none",
                  stroke:
                    currentRating <= (hover || rating || 0)
                      ? "#004EEB"
                      : "#98A2B3",
                },
                onMouseEnter: () => setHover(currentRating),
                onMouseLeave: () => setHover(null),
              }}
            />
          </label>
        );
      })}
    </div>
  );
};
