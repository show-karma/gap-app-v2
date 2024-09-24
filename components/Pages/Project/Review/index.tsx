"use client";
/* eslint-disable @next/next/no-img-element */
import toast from "react-hot-toast";
import { useProjectStore } from "@/store";
import { useReviewStore } from "@/store/review";

import { isAddressEqual } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { arbitrum } from "@wagmi/core/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { ReviewMode } from "@/types/review";
import { StarIcon } from "@/components/Icons";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { NavbarReview } from "@/components/Pages/Project/Review/NavbarReview";

import { SCORER_ID } from "@/utilities/review/constants/constants";
import { getBadgeIds } from "@/utilities/review/getBadgeIds";
import { getBadge } from "@/utilities/review/getBadge";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { CardNewReview } from "./CardNewReview";

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
  const project = useProjectStore((state: any) => state.project);
  const isOpenReview = useReviewStore((state: any) => state.isOpenReview);
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);

  const setActiveBadges = useReviewStore((state: any) => state.setActiveBadges);
  const setActiveBadgeIds = useReviewStore((state: any) => state.setActiveBadgeIds);

  const { openConnectModal } = useConnectModal();
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

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

  // Grab all recent badges and save on state
  const handleStoryBadges = async () => {
    const badgeIds = await getBadgeIds(SCORER_ID);
    const badges = badgeIds && (await Promise.all(badgeIds.map((id) => getBadge(id))));
    setActiveBadgeIds(badgeIds);
    setActiveBadges(badges);
  };

  return (
    <div className="space-y-5 flex w-full flex-col items-start justify-start gap-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-6 pb-8">
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
                    !isAddressEqual(project.recipient, address) ? ( // Check if the address is equal to the grant recipient address
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
