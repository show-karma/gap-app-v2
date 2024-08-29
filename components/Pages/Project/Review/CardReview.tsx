"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useReviewStore } from "@/store/review";

import { Badge, GrantStory, ReviewMode } from "@/types/review";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { getBadge } from "@/utilities/review/getBadge";

import { DynamicStarsReview } from "./DynamicStarsReview";

export const CardReview = ({ storie }: { storie: GrantStory }) => {
  const badges = useReviewStore((state: any) => state.badges);
  const setBadges = useReviewStore((state: any) => state.setBadges);

  useEffect(() => {
    if (storie.badgeIds.length > 0 && badges === null) {
      handleBadges();
    }
  }, [storie]);

  const handleBadges = async () => {
    const badgesIds = storie.badgeIds;
    const badges: Badge[] = await Promise.all(
      badgesIds.map(async (badgeId: string): Promise<Badge> => {
        return await getBadge(badgeId);
      }),
    );
    setBadges(badges);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {badges &&
          badges.map((badge: Badge, index: number) => (
            <div key={index} className="flex flex-col w-full px-14 mt-4">
              <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
                <img
                  src={addPrefixToIPFSLink(badge.metadata)}
                  alt="Badge Metadata"
                  className="h-20"
                />
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="order-2 sm:order-1">
                    <div className="sm:text-lg sm:text-start text-center text-xl">{badge.name}</div>
                    <div className="sm:text-sm sm:text-start text-center">{badge.description}</div>
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
