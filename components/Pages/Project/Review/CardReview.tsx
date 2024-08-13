"use client";

import { BadgeIcon, BadgeName } from "@/components/Icons/Badge";
import { DynamicStarsReview, ReviewMode } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";

export interface BadgeListProps {
  name: BadgeName;
  description: string;
  score: number;
}

export const CardReview = ({ id }: { id: number }) => {
  const review = useReviewStore((state) => state.review);
  const selectedBadgeList = review[id].reviews || [];

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {selectedBadgeList.map((badge: BadgeListProps, index: number) => (
          <div key={index} className="flex flex-col w-full px-14 mt-4">
            <div className="flex flex-row w-full items-center gap-3">
              <div>
                <BadgeIcon badgeName={badge.name} className="w-20 h-20" />
              </div>
              <div>
                <div className="text-lg">{badge.name}</div>
                <div className="text-sm">{badge.description}</div>
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
