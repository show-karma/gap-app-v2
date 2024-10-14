"use client";
/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";
import { useReviewStore } from "@/store/review";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { ReviewMode } from "@/types/review";
import { Spinner } from "@/components/Utilities/Spinner";
import { NavbarReview } from "@/components/Pages/Project/Review/NavbarReview";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { CardNewReview } from "./CardNewReview";
import { CardReviewSummary } from "./CardReviewSummary";

interface GrantAllReviewsProps {
  grant: IGrantResponse | undefined;
}

export const ReviewSection = ({ grant }: GrantAllReviewsProps) => {
  const isProjectLoading = useProjectStore((state: any) => state.loading);
  if (isProjectLoading || !grant) {
    <div className="space-y-5 flex w-full flex-row items-center justify-center">
      <Spinner />
    </div>;
  }

  const isOpenReview = useReviewStore((state: any) => state.isOpenReview);
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);

  return (
    <div className="space-y-5 flex w-full flex-col items-start justify-start gap-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-12 pb-8">
          {isOpenReview === ReviewMode.WRITE ? (
            <>
              <div className="flex w-full gap-2 p-4 dark:bg-[#18171C] bg-[#959FA8] border border-[#18171C] items-center">
                <ChevronLeftIcon
                  className="w-4 h-4 cursor-pointer dark:text-[#959FA8] text-black"
                  onClick={() => {
                    setIsOpenReview(ReviewMode.READ);
                  }}
                />
                <h2 className="dark:text-white text-black text-base font-semibold font-['Open Sans'] leading-normal">
                  Write a new review
                </h2>
              </div>
              <CardNewReview grant={grant} />
            </>
          ) : (
            isOpenReview === ReviewMode.READ && (
              <>
                <CardReviewSummary />
                <NavbarReview grant={grant} />
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
