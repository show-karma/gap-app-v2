/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { useReviewStore } from "@/store/review";
import { useSearchParams } from "next/navigation";

import { GrantStory, ReviewMode } from "@/types/review";

import { StarReviewIcon } from "@/components/Icons/StarReview";
import { CardReview } from "@/components/Pages/Project/Review/CardReview";
import { ChevronDown } from "@/components/Icons";

import { formatDate } from "@/utilities/formatDate";
import { getGrantStories } from "@/utilities/review/getGrantStories";
import { SCORER_DECIMALS } from "@/utilities/review/constants/constants";
import { ClockIcon } from "@/components/Icons/ClockIcon";
import { DynamicStarsReview } from "./DynamicStarsReview";

export const NavbarReview = () => {
  const isStarSelected = useReviewStore((state: any) => state.isStarSelected);
  const stories = useReviewStore((state: any) => state.stories);
  const grantUID = useReviewStore((state: any) => state.grantUID);
  const setGrantUID = useReviewStore((state: any) => state.setGrantUID);
  const setBadges = useReviewStore((state: any) => state.setBadges);
  const setStories = useReviewStore((state: any) => state.setStories);
  const setIsStarSelected = useReviewStore((state: any) => state.setIsStarSelected);

  const searchParams = useSearchParams();
  const setTimestamp = useReviewStore((state: any) => state.setTimestamp);
  const [timeDifference, setTimeDifference] = useState<number[]>([]);
  const [averageTimeDifference, setAverageTimeDifference] = useState<number | undefined>(undefined);

  const getTimestampDifferenceBetweenTimestamps = (
    timestamps: number[],
    grantStoriesLenght: number,
  ) => {
    const timeDifferenceBetweenTimestamps: number[] = [];

    for (let i = 0; i < timestamps.length - 1; i++) {
      /**
       * The difference between two timestamps in the received
       * array is the gap time between these two grant reviews.
       */
      timeDifferenceBetweenTimestamps.push(timestamps[i] - timestamps[i + 1]);
    }

    setTimeDifference(timeDifferenceBetweenTimestamps);
    const timeDifferenceSum = timeDifferenceBetweenTimestamps.reduce(
      (accumulator, current) => Number(accumulator) + Number(current),
      0,
    );
    /**
     *  Below we calculate the average time that it takes for the given grant to receive a new review
     */
    setAverageTimeDifference(timeDifferenceSum / grantStoriesLenght);
  };

  useEffect(() => {
    const grantIdFromQueryParam = searchParams?.get("grantId");
    if (grantIdFromQueryParam && grantUID !== grantIdFromQueryParam) {
      setBadges(null);
      setStories(null);
      setIsStarSelected(0);
      setGrantUID(grantIdFromQueryParam);
    }

    if (grantUID && !stories) {
      fetchGrantStories();
    }
  }, [grantUID, stories]);

  const fetchGrantStories = async () => {
    const grantStories = await getGrantStories(grantUID);
    setStories(grantStories);
    if (grantStories) {
      const timestamps = grantStories
        .sort((a: any, b: any) => Number(b.timestamp) - Number(a.timestamp))
        .map((grantStorie) => grantStorie.timestamp);
      setTimestamp(timestamps);
      getTimestampDifferenceBetweenTimestamps(timestamps, grantStories.length);
    }
  };

  const handleToggleReviewSelected = (id: number) => {
    const currentSelection = useReviewStore.getState().isStarSelected;
    useReviewStore.setState({
      isStarSelected: currentSelection === id ? null : id,
    });
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex gap-3 items-center">
        <ClockIcon />
        <h1
          aria-label="Reviews History"
          className="text-white text-base font-semibold font-['Open Sans'] leading-normal"
        >
          Reviews History
        </h1>
      </div>
      <div className="w-full flex gap-3 overflow-x-auto relative scroller">
        {stories && stories.length > 0 ? (
          stories
            .sort((a: any, b: any) => Number(b.timestamp) - Number(a.timestamp))
            .map((storie: GrantStory, index: number) => (
              <div
                key={index}
                className={`flex flex-col justify-center xl:justify-start items-center text-center relative py-3 px-4 gap-3 cursor-pointer ${
                  isStarSelected === index && "bg-[#26252A]"
                }`}
                onClick={() => {
                  setBadges(null);
                  handleToggleReviewSelected(index);
                }}
              >
                <div className="flex flex-col gap-2">
                  <p>{(Number(storie.averageScore) / 10 ** SCORER_DECIMALS).toFixed(1)}</p>
                  <DynamicStarsReview
                    totalStars={5}
                    rating={
                      storie.averageScore
                        ? Number(Number(storie.averageScore) / 10 ** SCORER_DECIMALS)
                        : 0
                    }
                    setRating={() => {}}
                    mode={ReviewMode.READ}
                  />
                </div>
                <div className="w-full flex flex-col items-center">
                  <p className="w-full">{formatDate(new Date(Number(storie.timestamp) * 1000))}</p>
                </div>
              </div>
            ))
        ) : (
          <div>
            <p>
              Be the first to share your thoughts! Reach out to the grantee and encourage them to
              leave a review.
            </p>
          </div>
        )}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && stories && <CardReview storie={stories[isStarSelected]} />}
      </div>
    </div>
  );
};
