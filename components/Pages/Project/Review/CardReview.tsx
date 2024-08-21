"use client";

import { BadgeIcon } from "@/components/Icons/Badge";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";
import { Badge, ReviewMode } from "@/types/review";

export const CardReview = ({ id }: { id: number }) => {
  const review = useReviewStore((state) => state.review);

  const isReviewSelected = review.find((review) => review.id === id);
  const reviews = isReviewSelected?.reviews || [];

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {reviews.map((badge: Badge, index: number) => (
          <div key={index} className="flex flex-col w-full px-14 mt-4">
            <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
              <div>
                <BadgeIcon badgeName={badge.name} className="w-20 h-20" />
              </div>
              <div>
                <div className="sm:text-lg sm:text-start text-center text-xl">
                  {badge.name}
                </div>
                <div className="sm:text-sm">{badge.description}</div>
              </div>
              <div>
                <DynamicStarsReview
                  totalStars={5}
                  rating={badge.score}
                  setRating={() => {}}
                  mode={ReviewMode.READ}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
