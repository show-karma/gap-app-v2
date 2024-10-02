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
        <div className="flex w-full flex-col items-start justify-between gap-6 pb-8">
          {isOpenReview === ReviewMode.WRITE ? (
            <>
              <div className="flex w-full gap-2 p-4 bg-[#18171C] border border-[#18171C] items-center">
                <ChevronLeftIcon
                  className="w-4 h-4 cursor-pointer text-[#959FA8] "
                  onClick={() => {
                    setIsOpenReview(ReviewMode.READ);
                  }}
                />
                <h2 className="text-white text-base font-semibold font-['Open Sans'] leading-normal">
                  Write a new review
                </h2>
              </div>
              <CardNewReview />
            </>
          ) : (
            isOpenReview === ReviewMode.READ && (
              <>
                <CardReviewSummary />
                <NavbarReview />
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
