"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import { useReviewStore } from "@/store/review";

import { Badge, GrantStory, ReviewMode } from "@/types/review";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { getBadge } from "@/utilities/review/getBadge";

import { DynamicStarsReview } from "./DynamicStarsReview";
import { Hex } from "viem";
import { formatDate } from "@/utilities/formatDate";

export const CardReview = ({ storie }: { storie: GrantStory }) => {
  const badges = useReviewStore((state: any) => state.badges);
  const setBadges = useReviewStore((state: any) => state.setBadges);

  useEffect(() => {
    if (storie && storie.badgeIds.length > 0 && badges === null) {
      handleBadges();
    }
  }, [storie]);

  const handleBadges = async () => {
    const badgesIds = storie.badgeIds;
    const fetchedBadges = await Promise.all(
      badgesIds.map(async (badgeId: Hex): Promise<Badge | null> => {
        return await getBadge(badgeId);
      }),
    );
    // Filter out null values
    const validBadges = fetchedBadges.filter((badge): badge is Badge => badge !== null);
    setBadges(validBadges);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col gap-2 border-x border-b rounded-md dark:border-[#26252A]">
        <div className="px-4 py-3 dark:bg-[#26252A] flex gap-2 items-center rounded-t-md">
          <p className="text-[#959fa8] text-xs font-bold font-['Open Sans'] uppercase leading-none">
            REVIEW
          </p>
          <p className="text-[#959fa8] text-xs font-bold font-['Open Sans'] uppercase leading-none">
            /
          </p>
          <p className="text-[#959fa8] text-xs font-bold font-['Open Sans'] uppercase leading-none">
            {formatDate(new Date(Number(storie.timestamp) * 1000))}
          </p>
        </div>
        {storie &&
          badges &&
          badges.map((badge: Badge, index: number) => (
            <div key={index} className="flex flex-col w-full px-5 py-4 gap-6">
              <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
                <img
                  src={addPrefixToIPFSLink(badge.metadata)}
                  alt="Badge Metadata"
                  className="h-20"
                />
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between">
                  <div className="order-2 sm:order-1 flex flex-col gap-1">
                    <div className="sm:text-lg sm:text-start text-center text-white text-base font-semiboldfont-['Open Sans'] leading-normal">
                      {badge.name}
                    </div>
                    <div className="sm:text-sm sm:text-start text-center text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
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
