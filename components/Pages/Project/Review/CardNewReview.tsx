"use client";
/* eslint-disable @next/next/no-img-element */
import toast from "react-hot-toast";
import { useEffect } from "react";
import { useReviewStore } from "@/store/review";
import { useSearchParams } from "next/navigation";

import { Hex } from "viem";
import { arbitrum } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";

import { ReviewMode, Badge } from "@/types/review";
import { Button } from "@/components/Utilities/Button";
import { DynamicStarsReview } from "./DynamicStarsReview";

import { AbiCoder } from "ethers";
import { KARMA_EAS_SCHEMA_UID } from "@/utilities/review/constants/constants";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { submitAttest } from "@/utilities/review/attest";
import { Spinner } from "@/components/Utilities/Spinner";
import { config } from "@/utilities/wagmi/config";
import { useForm, Controller } from "react-hook-form";
import { CheckIcon } from "@heroicons/react/24/solid";

export const CardNewReview = () => {
  const { control, handleSubmit } = useForm();
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

    if (!walletClient) {
      toast.error("Error getting wallet client for wallet interaction. Please try again.");
      return;
    }

    if (chainId != arbitrum.id) {
      toast.error("Must connect to Arbitrum to review");
      await walletClient.switchChain({ id: arbitrum.id });
      return;
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

  const optionsWhyDidYouApplyFor = [
    { label: "Dev tooling", value: "devTooling" },
    { label: "Education", value: "education" },
    { label: "Marketing and Growth", value: "marketingAndGrowth" },
    { label: "DeFi", value: "deFi" },
    { label: "DAOs and Governance", value: "dAOsAndGovernance" },
    { label: "Community", value: "Community" },
    { label: "Public Goods", value: "publicGoods" },
    { label: "ZK and privacy", value: "zkAndPrivacy" },
    { label: "Other", value: "other" },
  ];

  const optionsDidYouReceiveTheGrant = [
    { label: "Yes, I got approved", value: "yesIGotApproved" },
    { label: "No", value: "no" },
    { label: "I don't have the answer yet", value: "iDontHaveTheAnswerYet" },
  ];

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col p-6">
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 md:items-start items-center">
            <h1 className="text-base font-semibold font-['Open Sans'] leading-normal">
              Why did you apply for?
            </h1>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="WhyDidYouApplyFor"
                control={control}
                defaultValue={[]}
                render={({ field }) => {
                  const { value, onChange } = field;
                  return (
                    <div className="flex md:justify-between gap-3 items-center flex-wrap justify-center">
                      {optionsWhyDidYouApplyFor.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 w-[200px] font-normal text-sm leading-5 font-['Open Sans'] text-[#959FA8]"
                        >
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={value.includes(option.value)}
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? [...value, option.value]
                                : value.filter((value: string) => value !== option.value);
                              onChange(newValue);
                            }}
                            className="w-5 h-5 rounded-full border"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  );
                }}
              />
            </form>
          </div>
          <div className="w-full border border-[#26252A] my-7 flex"></div>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 md:items-start items-center">
            <h1 className="text-base font-semibold font-['Open Sans'] leading-normal">
              Did you receive the grant?
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="justify-between md:w-full">
              <Controller
                name="DidYouReceiveTheGrant"
                control={control}
                defaultValue={[]}
                render={({ field }) => {
                  const { value, onChange } = field;
                  return (
                    <div className="flex justify-between items-center gap-3 flex-col md:flex-row flex-wrap">
                      {optionsDidYouReceiveTheGrant.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-6 font-normal text-sm leading-5 font-['Open Sans'] text-[#959FA8]"
                        >
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={value.includes(option.value)}
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? [...value, option.value]
                                : value.filter((value: string) => value !== option.value);
                              onChange(newValue);
                            }}
                            className="w-5 h-5 rounded-full border"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  );
                }}
              />
            </form>
          </div>
          <div className="w-full border border-[#26252A] my-7 flex"></div>
        </div>
        {activeBadges ? (
          <>
            {activeBadges.map((badge: Badge, index: number) => (
              <div
                key={index}
                className="flex flex-col w-full py-5 px-4 border border-[#26252A] rounded-md"
              >
                <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-6">
                  <img
                    src={addPrefixToIPFSLink(badge.metadata)}
                    alt="Badge Metadata"
                    className="h-20"
                  />
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="order-2 sm:order-1">
                      <div className="sm:text-lg sm:text-start text-center text-base font-semibold font-['Open Sans'] leading-normal">
                        {badge.name}
                      </div>
                      <div className="text-sm order-2 sm:order-1 sm:text-start text-center font-normal leading-5 font-['Open Sans'] text-[#959FA8]">
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
            <div className="sm:flex-row sm:items-center justify-center flex sm:justify-end w-full mt-4 bg-[#18171C] py-4 md:px-6 ">
              <Button onClick={handleSubmitReview} className="bg-[#0E104D] gap-2 px-3">
                <CheckIcon className="w-3.5 h-3.5 text-white" /> Submit
              </Button>
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
