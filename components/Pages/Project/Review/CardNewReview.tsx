"use client";
/* eslint-disable @next/next/no-img-element */
import toast from "react-hot-toast";
import { useEffect } from "react";
import { useReviewStore } from "@/store/review";

import { encodeFunctionData, getContract, Hex } from "viem";
import { arbitrum } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { getWalletClient } from "@wagmi/core";

import { ReviewMode, Badge } from "@/types/review";
import { Button } from "@/components/Utilities/Button";
import { DynamicStarsReview } from "./DynamicStarsReview";

import { AbiCoder } from "ethers";
import { ARB_ONE_SCHEMA_REGISTRY } from "@/utilities/review/constants/constants";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { submitAttest } from "@/utilities/review/attest";

export const CardNewReview = () => {
  const setIsOpenReview = useReviewStore((state: any) => state.setIsOpenReview);
  const badges = useReviewStore((state: any) => state.badges);
  const stories = useReviewStore((state: any) => state.stories);
  const setBadgeScores = useReviewStore((state: any) => state.setBadgeScores);
  const badgeScores = useReviewStore((state: any) => state.badgeScores);
  const grantUID = useReviewStore((state: any) => state.grantUID);
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setBadgeScores(Array(badges.length).fill(1));
  }, []);

  // Grab all recent badges and save on state
  // const handleStoryBadges = async () => {
  //   const badgeIds = await getBadgeIds(SCORER_ID);
  //   const badges = await Promise.all(badgeIds.map((id) => getBadge(id)));
  //   setBadges(badges);
  // };

  // Score of the new review
  const handleSetRating = (index: number, rating: number) => {
    const updatededBadges = [...badgeScores];
    updatededBadges[index] = rating;
    setBadgeScores(updatededBadges);
  };

  // TODO: Should create the submit to blockchain
  const handleSubmitReview = async () => {
    if (!address) {
      toast.error("Must connect to submit a review");
      return;
    }

    if (chainId != arbitrum.id) {
      switchChain({ chainId: arbitrum.id });
      toast.error("Must connect to Arbitrum to review");
    }

    // Encode the data
    const abiCoder = new AbiCoder();
    const encodedData = abiCoder.encode(
      ["bytes32", "bytes32[]", "uint8[]"],
      [grantUID, , badgeScores], // badgeIds[] state goes in the middle
    );

    const response = await submitAttest(
      address,
      ARB_ONE_SCHEMA_REGISTRY,
      address,
      BigInt(0),
      false,
      grantUID,
      encodedData as Hex,
    );

    console.log(response);

    toast.success("Review submitted successfully!");
    setBadgeScores(Array(badges.length).fill(1));
    setIsOpenReview(ReviewMode.READ);
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
                <div className="text-sm order-2 sm:order-1 sm:text-start text-center">
                  {badge.description}
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
          ))}
      </div>
      <div className="flex justify-end w-full">
        <Button onClick={handleSubmitReview}>Submit Review</Button>
      </div>
    </div>
  );
};
