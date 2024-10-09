"use client";
/* eslint-disable react-hooks/exhaustive-deps */
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
import {
  CategoryOptions,
  CreatePreReviewRequest,
  KARMA_EAS_SCHEMA_UID,
  ReceivedGrantOptions,
} from "@/utilities/review/constants";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";
import { submitAttest } from "@/utilities/review/attest";
import { Spinner } from "@/components/Utilities/Spinner";
import { config } from "@/utilities/wagmi/config";
import { useForm, Controller } from "react-hook-form";
import { CheckIcon } from "@heroicons/react/24/solid";
import axios from "axios";

export const CardNewReview = () => {
  const { control, handleSubmit, getValues, trigger } = useForm();
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

  const handleSubmitAnswersReview = async () => {
    const isValid = await trigger(["WhyDidYouApplyFor", "DidYouReceiveTheGrant"]);

    if (isValid && address) {
      const values = getValues();
      const whyDidYouApplyFor: CategoryOptions = values.WhyDidYouApplyFor;
      const didYouReceiveTheGrant: ReceivedGrantOptions = values.DidYouReceiveTheGrant;

      if (whyDidYouApplyFor.length === 0 || didYouReceiveTheGrant.length === 0) {
        console.log("Você precisa selecionar uma opção em ambos os formulários.");
      } else {
        console.log("Valores do formulário:", values);

        // const connectedUserAddressData = {
        //   connectedUserAddress: address,
        // };

        // try {
        //   const axiosPostBD = await axios.post(
        //     "http://localhost:3001/api/v1/users",
        //     connectedUserAddressData,
        //   );
        //   console.log("axiosPostBD", axiosPostBD);
        // } catch (error) {
        //   console.error("Error creating User:", error);
        //   toast.error("Error creating User. Try again.");
        //   return;
        // }

        const newPreReview: CreatePreReviewRequest = {
          connectedUserAddress: address,
          preReviewAnswers: {
            category: whyDidYouApplyFor,
            receivedGrantOptions: didYouReceiveTheGrant,
          },
          programId: 0x1dac0e2beeba6f3eec76117545f39f28e8ecc3d2c22731b6072b2d87e82fa35d,
          // TODO: Get CategoryOptions/ReceivedGrantOptions/ProgramId dynamically
        };

        try {
          const axiosPostBD = await axios.post(
            "http://localhost:3001/api/v1/reviews",
            newPreReview,
          );
          console.log("axiosPostBD", axiosPostBD);
        } catch (error) {
          console.error("Error posting review:", error);
          toast.error("Error submitting review. Try again.");
          return;
        }
      }
    } else {
      console.log("Validação falhou.");
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

    handleSubmitAnswersReview();

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

  interface OptionsWhyDidYouApplyFor {
    label: CategoryOptions;
    value: CategoryOptions;
  }

  interface OptionsDidYouReceiveTheGrant {
    label: ReceivedGrantOptions;
    value: ReceivedGrantOptions;
  }

  const optionsWhyDidYouApplyFor: OptionsWhyDidYouApplyFor[] = Object.values(CategoryOptions).map(
    (category) => ({
      label: category,
      value: category,
    }),
  );

  const optionsDidYouReceiveTheGrant: OptionsDidYouReceiveTheGrant[] = Object.values(
    ReceivedGrantOptions,
  ).map((option) => ({
    label: option,
    value: option,
  }));

  const onSubmit = (data: any) => {
    console.log("data", data);
  };

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col p-6">
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 md:items-start items-center">
            <h1 className="text-base font-semibold font-['Open Sans'] leading-normal">
              Why did you apply for?
            </h1>

            <form>
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
                                ? [option.value]
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
            <form className="justify-between md:w-full">
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
                                ? [option.value]
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
            <div className="sm:flex-row sm:items-center justify-center flex sm:justify-end w-full mt-4 dark:bg-[#18171C] bg-[#959FA8] py-4 md:px-6 ">
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
