/* eslint-disable no-nested-ternary */

import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { Grant } from "@show-karma/karma-gap-sdk";
import axios from "axios";
import { type FC, useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { ReviewForm } from "./ReviewForm";
import { useProjectStore } from "@/store";
import { Question } from "@/types";
import { ReviewerInfo } from "@/types/reviewer";
import fetchData from "@/utilities/fetchData";
import {
  INDEXER,
  MESSAGES,
  getQuestionsOf,
  hasAlreadyReviewed,
} from "@/utilities";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";

interface ReviewGrantProps {
  grant: Grant | undefined;
}

export const ReviewGrant: FC<ReviewGrantProps> = ({ grant }) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const loading = useProjectStore((state) => state.loading);
  const { address } = useAccount();

  const [isFetching, setIsFetching] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false);
  const [reviewerInfo, setReviewerInfo] = useState<ReviewerInfo>({
    choice: undefined,
    name: undefined,
    email: undefined,
    categories: undefined,
  });

  useEffect(() => {
    const getReviewerInfo = async () => {
      try {
        const [data] = await fetchData(
          INDEXER.GRANTS.REVIEWS.REVIEWER.GET_INFOS(address as string)
        );
        if (data.choice === true || data.choice === false) {
          data.choice = data.choice === true ? "yes" : "no";
        }
        setReviewerInfo(data);
      } catch (error) {
        setReviewerInfo({
          choice: undefined,
          name: undefined,
          email: undefined,
          categories: undefined,
        });
        console.log(error);
      }
    };
    getReviewerInfo();
  }, [address]);

  useEffect(() => {
    if (!grant) return;
    const getQuestions = async () => {
      setIsFetching(true);
      try {
        const data = await getQuestionsOf(grant.uid);
        setQuestions(data);
      } catch (error) {
        console.log(error);
        setQuestions([]);
      } finally {
        setIsFetching(false);
      }
    };

    getQuestions();
  }, [grant]);

  useEffect(() => {
    if (!grant) return;
    if (questions.length && address) {
      const getAlreadyReviewed = async () => {
        setIsFetching(true);
        try {
          const data = await hasAlreadyReviewed(grant.uid, address);
          setAlreadyReviewed(data);
        } catch (error) {
          console.log(error);
          setAlreadyReviewed(false);
        } finally {
          setIsFetching(false);
        }
      };

      getAlreadyReviewed();
    }
  }, [questions, address]);

  if (loading) {
    <div>
      <Spinner />
    </div>;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p>Please, connect your wallet.</p>
        <Button onClick={openConnectModal}>Connect wallet</Button>
      </div>
    );
  }

  // const hasSpecific = grant.categories?.find(
  //   (category) => specificCategoriesAndQuestions[category]
  // );

  return (
    <div className="mt-5 space-y-5 flex w-full justify-start">
      <div className="flex w-full max-w-5xl flex-col items-start justify-start gap-1">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex w-full flex-col items-start justify-between gap-6  border-b border-b-zinc-300 pb-8">
            <h2 className="text-2xl font-normal">Review Grant</h2>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold">Goal of review</h3>
              <p>
                {`The purpose of the review is to evaluate the extent to which the
  contributions of grantees have aligned with and advanced the
  DAO's mission of spearheading the evolution of decentralized
  technologies and governance.`}
              </p>
              <p>
                {`This review aims to assess the impact, relevance, and
  effectiveness of the grantees' past work in supporting the DAO's
  objectives, ensuring that the retroactive funding recognizes and
  encourages meaningful and impactful contributions within the DAO
  ecosystem.`}
              </p>
            </div>
            {/* {hasSpecific ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">Goal of review</h3>
                {specificCategoriesAndQuestions[hasSpecific]}
              </div>
            ) : null} */}
          </div>
        </div>
        {loading || isFetching ? (
          <div className="flex w-full items-center justify-center">
            <Spinner />
          </div>
        ) : questions.length && grant ? (
          <div className="mt-4 flex w-full flex-col justify-start gap-4 rounded-lg px-3">
            <ReviewForm
              grant={grant}
              allQuestions={questions}
              alreadyReviewed={alreadyReviewed}
              reviewerInfo={reviewerInfo}
            />
          </div>
        ) : (
          <p>{MESSAGES.GRANT.REVIEW.CAN_NOT_REVIEW}</p>
        )}
      </div>
    </div>
  );
};
