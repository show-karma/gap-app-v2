"use client";

import { BadgeIcon, BadgeName } from "@/components/Icons/Badge";
import React from "react";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";

export enum CardReviewMode {
  READ = "READ",
  WRITE = "WRITE",
}
interface CardReviewDataProps {
  id: number;
  mode: CardReviewMode;
}

export interface BadgeListProps {
  name: BadgeName;
  description: string;
  score: number;
}

export const CardReview = (data: CardReviewDataProps) => {
  const setBadgeList = useReviewStore((state) => state.setBadgeList);
  const badgeList = useReviewStore((state) => state.badgeList);

  const selectedBadgeList = badgeList[data.id] || [];

  const handleSetRating = (index: number, rating: number) => {
    const updatedBadgeList = [...badgeList];
    const updatedBadges = [...updatedBadgeList[data.id]];

    if (updatedBadges[index]) {
      updatedBadges[index] = { ...updatedBadges[index], score: rating };
    }

    updatedBadgeList[data.id] = updatedBadges;
    setBadgeList(updatedBadgeList);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {selectedBadgeList.map((badge: BadgeListProps, index: number) => (
          <div key={index} className="flex flex-col w-full px-14 mt-4">
            <div className="flex flex-row w-full items-center gap-3">
              <div>
                <BadgeIcon badgeName={badge.name} className="w-20 h-20" />
              </div>
              <div className="text-sm">{badge.description}</div>
              <div>
                {data.mode === CardReviewMode.WRITE ? (
                  <DynamicStarsReview
                    totalStars={5}
                    rating={badge.score}
                    setRating={(rating) => handleSetRating(index, rating)}
                    mode={CardReviewMode.WRITE}
                  />
                ) : (
                  <DynamicStarsReview
                    totalStars={5}
                    rating={badge.score}
                    setRating={() => {}}
                    mode={CardReviewMode.READ}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
