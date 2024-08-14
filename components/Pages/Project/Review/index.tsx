"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useProjectStore } from "@/store";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { StarIcon } from "@/components/Icons";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { NavbarReview } from "@/components/Pages/Project/Review/NavbarReview";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { CardNewReview } from "./CardNewReview";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { isAddressEqual } from "viem";
import { ReviewMode } from "@/types/review";
import { useReviewStore } from "@/store/review";

interface GrantAllReviewsProps {
  grant: IGrantResponse | undefined;
}

export const ReviewSection = ({ grant }: GrantAllReviewsProps) => {
  const isProjectLoading = useProjectStore((state) => state.loading);
  if (isProjectLoading || !grant) {
    <div className="space-y-5 flex w-full flex-row items-center justify-start">
      <Spinner />
    </div>;
  }
  const isOpenReview = useReviewStore((state) => state.isOpenReview);
  const setIsOpenReview = useReviewStore((state) => state.setIsOpenReview);
  const project = useProjectStore((state) => state.project);
  const { openConnectModal } = useConnectModal();
  const { isConnected, address } = useAccount();

  const handleReviewButton = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
    } else {
      setIsOpenReview(ReviewMode.WRITE);
    }
  };

  return (
    <div className="space-y-5 flex w-full flex-col items-start justify-start gap-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-6 border-b border-b-zinc-300 pb-8">
          {isOpenReview === ReviewMode.WRITE ? (
            <>
              <div className="flex w-full justify-between">
                <h2 className="text-2xl font-normal">Write a new review</h2>
                <button
                  type="button"
                  className=" hover:opacity-75 transition-all ease-in-out duration-200 dark:text-zinc-100"
                  onClick={() => {
                    setIsOpenReview(ReviewMode.READ);
                  }}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <CardNewReview />
            </>
          ) : (
            isOpenReview === ReviewMode.READ && (
              <>
                <div className="flex flex-col w-full">
                  <div className="flex w-full justify-between">
                    <h2 className="text-2xl font-normal">
                      All reviews of <b>{grant?.details?.data?.title}</b>
                    </h2>
                    {isConnected &&
                    project?.recipient &&
                    address &&
                    !isAddressEqual(project.recipient, address) ? ( //TODO: Remove this (negation)!
                      <Button
                        disabled={false}
                        onClick={handleReviewButton}
                        className="flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
                      >
                        <StarIcon />
                        Review
                      </Button>
                    ) : (
                      !isConnected && (
                        <Button
                          disabled={false}
                          onClick={openConnectModal}
                          className="flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
                        >
                          Connect Wallet
                        </Button>
                      )
                    )}
                  </div>
                  <div>
                    <p>Aggregate a reputation to a grants program</p>
                  </div>
                </div>
                <NavbarReview />
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
