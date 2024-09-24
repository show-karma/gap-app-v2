"use client";
/* eslint-disable @next/next/no-img-element */
import toast from "react-hot-toast";
import { useEffect } from "react";
import { useReviewStore } from "@/store/review";
import { useSearchParams } from "next/navigation";

import { Hex } from "viem";
import { arbitrum } from "viem/chains";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";

import { ReviewMode, Badge } from "@/types/review";
import { Button } from "@/components/Utilities/Button";
import { DynamicStarsReview } from "./DynamicStarsReview";

import { AbiCoder } from "ethers";
import { KARMA_EAS_SCHEMA_UID } from "@/utilities/review/constants/constants";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { submitAttest } from "@/utilities/review/attest";
import { Spinner } from "@/components/Utilities/Spinner";
import { config } from "@/utilities/wagmi/config";

export const CardNewReview = () => {
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);
  const setBadgeScores = useReviewStore((state: any) => state.setBadgeScores);
  const badgeScores = useReviewStore((state: any) => state.badgeScores);
  const grantUID = useReviewStore((state: any) => state.grantUID);
  const setGrantUID = useReviewStore((state: any) => state.setGrantUID);
  const activeBadges = useReviewStore((state: any) => state.activeBadges);
  const activeBadgeIds = useReviewStore((state: any) => state.activeBadgeIds);
  const setStories = useReviewStore((state: any) => state.setStories);
  const setIsStarSelected = useReviewStore((state: any) => state.setIsStarSelected);
  const setBadges = useReviewStore((state: any) => state.setBadges);

  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const searchParams = useSearchParams();
  const { data: walletClient } = useWalletClient({ config });

  useEffect(() => {
    // Fill the starts with a score of 1 when the badges render
    if (activeBadges) {
      setBadgeScores(Array(activeBadges.length).fill(1));
    }
    const grantIdFromQueryParam = searchParams?.get("grantId");
    if (grantIdFromQueryParam) {
      setGrantUID(grantIdFromQueryParam);
    }
  }, [activeBadges]);

  // Score of the new review
  const handleSetRating = (index: number, rating: number) => {
    if (rating >= 1 || rating <= 5) {
      const updatededBadges = [...badgeScores];
      updatededBadges[index] = rating;
      setBadgeScores(updatededBadges);
    } else {
      toast.error("Invalid rating. Can only score between 1 and 5");
    }
  };

  /**
   * Handles the submission of a review to submitAttest.
   *
   */
  const handleSubmitReview = async () => {
    if (!address) {
      toast.error("Must connect to submit a review");
      return;
    }

    if (chainId != arbitrum.id) {
      toast.error("Must connect to Arbitrum to review");
      await switchChainAsync?.({ chainId: arbitrum.id });
    }

    if (activeBadges.length !== badgeScores.length) {
      toast.error(
        "Different number of badges and scores. Code should be unreachable, contact the team!",
      );
    }

    // Encode the data
    const abiCoder = new AbiCoder();
    const encodedData = abiCoder.encode(
      ["bytes32", "bytes32[]", "uint8[]"],
      [grantUID, activeBadgeIds, badgeScores],
    );

    if (!walletClient) {
      toast.error("Error getting wallet client for wallet interaction. Please try again.");
      return;
    }

    if (walletClient.chain.id !== arbitrum.id) {
      toast.error("Must connect to Arbitrum to review", {
        id: "connect-to-arbitrum-to-review",
      });
      await switchChainAsync?.({ chainId: arbitrum.id });
      return;
    }

    const response = await submitAttest(
      address,
      KARMA_EAS_SCHEMA_UID,
      address,
      BigInt(0),
      false,
      grantUID,
      encodedData as Hex,
      walletClient,
    );

    if (response instanceof Error) {
      toast.error("Error submitting review. Try again.");
      return;
    }

    setBadges(null);
    setStories(null);
    setIsStarSelected(0);
    setBadgeScores(Array(activeBadges.length).fill(1));
    toast.success("Review submitted successfully!");
    setIsOpenReview(ReviewMode.READ);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {activeBadges ? (
          <>
            {activeBadges.map((badge: Badge, index: number) => (
              <div key={index} className="flex flex-col w-full sm:pr-14 mt-4">
                <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
                  <img
                    src={addPrefixToIPFSLink(badge.metadata)}
                    alt="Badge Metadata"
                    className="h-20"
                  />
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="order-2 sm:order-1">
                      <div className="sm:text-lg sm:text-start text-center text-xl">
                        {badge.name}
                      </div>
                      <div className="text-sm order-2 sm:order-1 sm:text-start text-center">
                        {badge.description}
                      </div>
                    </div>
                    <div className="order-1 sm:order-2">
                      <DynamicStarsReview
                        totalStars={5}
                        rating={badgeScores[index]}
                        setRating={(rating) => handleSetRating(index, rating)}
                        mode={ReviewMode.WRITE}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="sm:flex-row sm:items-center justify-center flex sm:justify-end w-full sm:pr-14 mt-4">
              <Button onClick={handleSubmitReview}>Submit Review</Button>
            </div>
          </>
        ) : (
          <div className="space-y-5 flex w-full flex-row items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
};
