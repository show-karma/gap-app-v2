/* eslint-disable @next/next/no-img-element */
"use client";

import { DynamicStarsReview } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";
import { Badge, GrantStory, ReviewMode } from "@/types/review";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";

export const CardReview = ({ storie }: { storie: GrantStory }) => {
  const badge = useReviewStore((state) => state.badge);

  //TODO: Select latest badge by default
  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {badge &&
          badge.map((badge: Badge, index: number) => (
            <div key={index} className="flex flex-col w-full px-14 mt-4">
              <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
                <img
                  src={addPrefixToIPFSLink(badge.metadata)}
                  alt="Badge Metadata"
                  className="h-20"
                />

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="order-2 sm:order-1">
                    <div className="sm:text-lg sm:text-start text-center text-xl">
                      {badge.name}
                    </div>
                    <div className="sm:text-sm sm:text-start text-center">
                      {badge.description}
                    </div>
                  </div>
                  <div className="order-1 sm:order-2">
                    <DynamicStarsReview
                      totalStars={5}
                      rating={storie.badgeScores[index]}
                      setRating={() => {}}
                      mode={ReviewMode.READ}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
