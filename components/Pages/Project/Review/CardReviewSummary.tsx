/* eslint-disable react-hooks/exhaustive-deps */
import { GrantStory, ReviewMode } from "@/types/review";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/Utilities/Button";
import { isAddressEqual } from "viem";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useProjectStore } from "@/store";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { arbitrum } from "viem/chains";
import { useReviewStore } from "@/store/review";
import { getBadgeIds } from "@/utilities/review/getBadgeIds";
import { SCORER_DECIMALS, SCORER_ID } from "@/utilities/review/constants/";
import { getBadge } from "@/utilities/review/getBadge";
import { ProgressBar } from "./ProgressBar";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SupportedRatings = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

const enum IntervalMessage {
  PER_DAY = "per day",
  PER_WEEK = "per week",
  PER_MONTH = "per month",
  PER_YEAR = "per year",
}

interface RatingData {
  countOfReviews: number;
  percentageComparedToAllTheReviews: number;
}

export const CardReviewSummary = () => {
  const project = useProjectStore((state: any) => state.project);
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);
  const setActiveBadges = useReviewStore((state: any) => state.setActiveBadges);
  const setActiveBadgeIds = useReviewStore((state: any) => state.setActiveBadgeIds);
  const stories = useReviewStore((state: any) => state.stories);
  const [timestampInterval, setTimestampInterval] = useState<number | null>(null);
  const [averageScoreReview, setAverageScoreReview] = useState<number | null>(null);
  const [intervalMessage, setIntervalMessage] = useState<string | undefined>(undefined);
  const [ratingData, setRatingData] = useState<RatingData[]>([]);
  const [isGapUser, setIsGapUser] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { isConnected, address, chainId } = useAccount();

  // Grab all recent badges and save on state
  const handleStoryBadges = async () => {
    const badgeIds = await getBadgeIds(SCORER_ID);
    const badges = badgeIds && (await Promise.all(badgeIds.map((id) => getBadge(id))));
    setActiveBadgeIds(badgeIds);
    setActiveBadges(badges);
  };

  const handleReviewButton = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
    } else {
      if (chainId != arbitrum.id) {
        switchChain({ chainId: arbitrum.id });
        toast.error("Must connect to Arbitrum to review");
      } else {
        setIsOpenReview(ReviewMode.WRITE);
        handleStoryBadges();
      }
    }
  };

  const score = stories?.map((grantStorie: GrantStory) => grantStorie.averageScore) || [];

  /**
   * Calculates the average review score and updates the state with the result.
   *
   * @param score - An array of numbers representing individual review scores.
   * @param grantStoriesLength - The total number of grant stories.
   */
  const getAverageReviewScore = (reviewsScores: number[], reviewsLength: number) => {
    const scoresSummed = reviewsScores.reduce(
      (accumulator, current) => Number(accumulator) + Number(current),
      0,
    );

    setAverageScoreReview(Number(scoresSummed) / 10 ** SCORER_DECIMALS / Number(reviewsLength));
  };

  const grantIdFromQueryParam = searchParams?.get("grantId");

  useEffect(() => {
    if (stories && stories.length) {
      getAverageReviewScore(score, stories.length);
      const timestamps = stories.map((story: GrantStory) => Number(story.timestamp));
      getScoreRatingFilteredReviews();
      const timestampNow = Math.floor(Date.now() / 1000); /* Get the current timestamp in seconds */
      getTimestampInterval(timestamps, timestampNow);
    } else {
      setTimestampInterval(null);
      setIntervalMessage(undefined);
    }
  }, [stories, grantIdFromQueryParam]);

  const getTimestampInterval = (timestamps: number[], timestampNow: number) => {
    if (!timestamps.length) return;
    if (!stories.length) return;

    const timestampStart = Math.min(...timestamps);
    const totalInterval = timestampNow - timestampStart;

    const numberOfReviews = timestamps.length;
    const intervalPerReview = totalInterval / numberOfReviews;

    setTimestampInterval(intervalPerReview);
    setIntervalMessage(getIntervalMessage(intervalPerReview));
  };

  const getIntervalMessage = (interval: number): string => {
    const days = interval / (60 * 60 * 24);

    if (days <= 1) {
      return `Typically reviewed ${stories.length} time${stories.length > 1 ? "s" : ""} ${IntervalMessage.PER_DAY
        }`;
    } else if (days <= 7) {
      return `Typically reviewed ${Math.round(7 / days)} times ${IntervalMessage.PER_WEEK}`;
    } else if (days <= 30) {
      return `Typically reviewed ${Math.round(30 / days)} times ${IntervalMessage.PER_MONTH}`;
    } else if (days <= 365) {
      return `Typically reviewed ${Math.round(365 / days)} times ${IntervalMessage.PER_YEAR}`;
    } else {
      return `Typically reviewed each ${Math.round(days)} days`;
    }
  };

  const getNumberOfReviewsByRating = (allReviews: number[], targetedRating: number) => {
    return allReviews.filter((rating) => rating === targetedRating).length;
  };

  /**
   * Calculates and sets each available score selection percentual based on the total selection each score had
   * alongside with the total scores selections the grant program had.
   *
   * This function maps through the reviews, rounds their average scores, and filters them
   * by each star rating (1 to 5). It then calculates the percentage of each star rating
   * relative to the total number of reviews and sets the ratings proportional selections
   */
  const getScoreRatingFilteredReviews = () => {
    const scoresOfReviews = stories.map((story: GrantStory) =>
      Math.round(Number(story.averageScore) / 10 ** SCORER_DECIMALS),
    );

    let reviewsPerRating: Record<number, number> = {};

    Object.values(SupportedRatings).forEach((rating) => {
      reviewsPerRating = {
        ...reviewsPerRating,
        [rating]: getNumberOfReviewsByRating(scoresOfReviews, rating),
      };
    });

    const reviewsWithPercentualRelevance: RatingData[] = Object.values(reviewsPerRating).map(
      (numberOfReviews) => {
        const percentage = (numberOfReviews / stories.length) * 100;
        return {
          countOfReviews: numberOfReviews,
          percentageComparedToAllTheReviews: percentage,
        };
      },
    );

    setRatingData(reviewsWithPercentualRelevance);
  };

  useEffect(() => {
    const getGapUser = async () => {
      const response = fetch(`https://gapapi.karmahq.xyz/grantees/${address}/is-gap-user`)
      const data = await (await response).text()
      setIsGapUser(data)
    }
    getGapUser()
  }, [])

  return (
    <div className="flex flex-col w-full gap-5">
      <div className="flex w-full justify-between items-center">
        <div className="flex gap-2">
          <DynamicStarsReview
            totalStars={1}
            rating={0}
            setRating={() => { }}
            mode={ReviewMode.READ}
          />
          <h2 className="text-base font-semibold font-['Open Sans'] leading-normal">
            Reviews Summary
          </h2>
        </div>
        {isConnected &&
          project?.recipient &&
          address &&
          isGapUser === 'true' &&
          !isAddressEqual(project.recipient, address) ? ( // Check if the address is equal to the grant recipient address
          <Button
            disabled={false}
            onClick={handleReviewButton}
            className="bg-[#0E104D] gap-2 px-3 items-center"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Review
          </Button>
        ) : (
          !isConnected && (
            <Button
              disabled={false}
              onClick={openConnectModal}
              className="bg-[#0E104D] gap-2 px-3 items-center"
            >
              Connect Wallet
            </Button>
          )
        )}
      </div>
      <div className="flex lg:gap-4 xl:gap-8 gap-8 border border-[#26252A] rounded-lg p-6 justify-between md:flex-row flex-col">
        <div className="flex flex-col gap-3 h-full items-center md:items-start">
          <div className="flex">
            <h1 className="text-[#959FA8] text-xs leading-4 font-bold font-['Open Sans']">
              Total Review
            </h1>
          </div>
          <div className="flex flex-col gap-2 md:items-start items-center">
            {stories && (
              <h2 className="font-medium text-[56px] leading-[56px] font-['Open Sans']">
                {stories.length}
              </h2>
            )}
            <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight text-center sm:text-start">
              {intervalMessage ?? "Not reviewed yet"}
            </p>
          </div>
        </div>
        <div className="w-6 h-[124px] justify-center items-center gap-2.5 relative hidden md:inline-flex">
          <div className="border border-[#26252A] h-full" />
          <div className="w-[3px] h-8 bg-[#1832ed] rounded-[100px] absolute"></div>
        </div>
        <div className="flex flex-col gap-3 h-full items-center md:items-start">
          <div className="flex">
            <h1 className="text-[#959FA8] text-xs leading-4 font-bold font-['Open Sans']">
              Average Review
            </h1>
          </div>
          <div className="flex flex-col gap-2 md:items-start items-center">
            {averageScoreReview ? (
              <h2 className="font-medium text-[56px] leading-[56px] font-['Open Sans']">
                {averageScoreReview.toFixed(1)}
              </h2>
            ) : (
              <h2 className="font-medium text-[56px] leading-[56px] font-['Open Sans']">0</h2>
            )}
            <DynamicStarsReview
              totalStars={5}
              rating={averageScoreReview ? Number(averageScoreReview.toFixed(0)) : 0}
              setRating={() => { }}
              mode={ReviewMode.READ}
            />
          </div>
        </div>
        <div className="w-6 h-[124px] justify-center items-center gap-2.5 relative hidden md:inline-flex">
          <div className="border border-[#26252A] h-full" />
          <div className="w-[3px] h-8 bg-[#1832ed] rounded-[100px] absolute"></div>
        </div>
        <div className="flex lg:justify-end justify-center">
          <div className="flex gap-1.5 items-start justify-center flex-col-reverse">
            {ratingData && ratingData.length ? (
              ratingData.map(({ countOfReviews, percentageComparedToAllTheReviews }, index) => (
                <div className="flex gap-2 items-center" key={index}>
                  <p className="dark:text-white text-sm font-bold font-['Open Sans'] leading-tight">
                    {index + 1}
                  </p>
                  <ProgressBar actualPercentage={percentageComparedToAllTheReviews} />
                  <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
                    {countOfReviews ? percentageComparedToAllTheReviews.toFixed(0) : "0"}%
                  </p>
                </div>
              ))
            ) : (
              <div className="flex gap-1.5 items-start justify-center flex-col-reverse">
                {Object.values(SupportedRatings).map((rating) => (
                  <div className="flex gap-2 items-center" key={rating}>
                    <p className="dark:text-white text-sm font-bold font-['Open Sans'] leading-tight">
                      {rating}
                    </p>
                    <ProgressBar actualPercentage={0} />
                    <p className="text-[#959fa8] text-sm font-normal font-['Open Sans'] leading-tight">
                      0%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
