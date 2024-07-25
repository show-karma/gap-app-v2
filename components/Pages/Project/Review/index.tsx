"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { additionalQuestion } from "@/utilities/tabs";
import { useProjectStore } from "@/store";
import { getReviewsOf, getAnonReviewsOf } from "@/utilities/sdk";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { StarIcon } from "@/components/Icons";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { CardReview } from "./CardReview";
import { NavbarReview } from "./NavbarReview";

interface GrantAllReviewsProps {
  grant: IGrantResponse | undefined;
}

type Review = {
  answers: {
    query: string;
    rating: number;
    answer: string;
    questionId: number;
  }[];
  publicAddress: string;
  createdAt: string;
};
type AnonReview = {
  answers: {
    query: string;
    rating: number;
    answer: string;
    questionId: number;
    createdAt: string;
  }[];
  nullifier: string;
  createdAt: string;
};

export const ReviewSection = ({ grant }: GrantAllReviewsProps) => {
  const isProjectLoading = useProjectStore((state) => state.loading);
  if (isProjectLoading || !grant) {
    <div className="space-y-5 flex w-full flex-row items-center justify-start">
      <Spinner />
    </div>;
  }
  const project = useProjectStore((state) => state.project);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingAnon, setIsFetchingAnon] = useState(false);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [allAnonReviews, setAllAnonReviews] = useState<AnonReview[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [anonReviews, setAnonReviews] = useState<AnonReview[]>([]);
  const [page, setPage] = useState(1);
  const [pageAnon, setPageAnon] = useState(1);
  const pageLimit = 10;

  useEffect(() => {
    if (!grant) return;

    const getReviews = async () => {
      setIsFetching(true);
      if (!grant) return;
      try {
        const data: Review[] = await getReviewsOf(grant.uid);
        const orderedData = data.map((review) => ({
          ...review,
          answers: [
            ...review.answers.filter(
              (answer) => !additionalQuestion(answer.questionId, answer.query)
            ),
            ...review.answers.filter((answer) =>
              additionalQuestion(answer.questionId, answer.query)
            ),
          ],
        }));
        const sortByDate = (a: Review, b: Review) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        const sortedData = orderedData.sort(sortByDate);
        setAllReviews(sortedData);
        const slicedData = sortedData.slice(0, pageLimit);

        setReviews(slicedData);
      } catch (error) {
        console.log(error);
        setReviews([]);
      } finally {
        setIsFetching(false);
      }
    };

    const getReviewsAnon = async () => {
      setIsFetchingAnon(true);
      if (!grant) return;
      try {
        const data: AnonReview[] = await getAnonReviewsOf(grant.uid);
        const orderedData = data.map((review) => ({
          ...review,

          answers: [
            ...review.answers.filter(
              (answer) => !additionalQuestion(answer.questionId, answer.query)
            ),
            ...review.answers.filter((answer) =>
              additionalQuestion(answer.questionId, answer.query)
            ),
          ],
        }));
        const sortByDate = (a: AnonReview, b: AnonReview) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        const sortedData = orderedData.sort(sortByDate);
        setAllAnonReviews(sortedData);
        const slicedData = sortedData.slice(0, pageLimit);

        setAnonReviews(slicedData);
      } catch (error) {
        console.log(error);
        setAnonReviews([]);
      } finally {
        setIsFetchingAnon(false);
      }
    };

    getReviews();
    getReviewsAnon();
  }, [grant]);

  useEffect(() => {
    const slicedData = allReviews.slice(
      (page - 1) * pageLimit,
      page * pageLimit
    );
    setReviews(slicedData);

    const slicedAnonData = allAnonReviews.slice(
      (pageAnon - 1) * pageLimit,
      pageAnon * pageLimit
    );
    setAnonReviews(slicedAnonData);
  }, [page]);

  return (
    <div className="space-y-5 flex w-full flex-col items-start justify-start gap-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-6 border-b border-b-zinc-300 pb-8">
          <div className="flex w-full justify-between">
            <h2 className="text-2xl font-normal">
              All reviews of <b>{grant?.details?.data?.title}</b>
            </h2>
            <Button
              disabled={false}
              onClick={() => {}}
              className="flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900"
            >
              <StarIcon />
              Review
            </Button>
          </div>

          <NavbarReview />

          {/* <CardReview /> */}
        </div>
      </div>
    </div>
  );
};
