"use client";
/* eslint-disable @next/next/no-img-element */
import { Button } from "../Utilities/Button";
import Pagination from "../Utilities/Pagination";
import { Spinner } from "../Utilities/Spinner";
import { useEffect, useState } from "react";
import { additionalQuestion, votingPowerCommunities } from "@/utilities/tabs";
import { ExternalLink } from "../Utilities/ExternalLink";
import { Hex } from "viem";
import EthereumAddressToENSName from "../EthereumAddressToENSName";
import EthereumAddressToENSAvatar from "../EthereumAddressToENSAvatar";
import { useProjectStore } from "@/store";
import { VotingPowerPopover } from "../VotingPowerPopover";
import { blo } from "blo";
import Link from "next/link";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { getReviewsOf, getAnonReviewsOf } from "@/utilities/sdk";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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

export const GrantAllReviews = ({ grant }: GrantAllReviewsProps) => {
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

  // const hasSpecific = grant.categories?.find(
  //   (category) => specificCategoriesAndQuestions[category]
  // );

  return (
    <div className="space-y-5 flex w-full flex-col items-start justify-start gap-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex w-full flex-col items-start justify-between gap-6  border-b border-b-zinc-300 pb-8">
          <h2 className="text-2xl font-normal">
            All reviews of <b>{grant?.details?.data?.title}</b>
          </h2>
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
        {isFetching && isFetchingAnon ? (
          <div className="flex w-full flex-row justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full flex-1 flex-col gap-3">
              {reviews.length || anonReviews.length ? (
                <>
                  {anonReviews.map((review, index) => (
                    <div
                      className="flex flex-col items-start justify-start gap-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-4"
                      key={`${review.nullifier}${+index}`}
                    >
                      <div className="flex w-full flex-row items-center justify-between gap-4">
                        <div className="flex flex-1 flex-row items-center justify-start gap-2">
                          <p className="text-base font-normal text-black dark:text-white">
                            Review by Anon User 🕵️
                          </p>
                          {votingPowerCommunities.find(
                            (item) =>
                              item.toLowerCase() ===
                                grant?.community?.details?.data?.name?.toLowerCase() ||
                              item.toLowerCase() ===
                                grant?.community?.details?.data?.slug?.toLowerCase()
                          ) ? (
                            grant?.community ? (
                              <VotingPowerPopover
                                reviewer={review.nullifier}
                                community={grant.community}
                              >
                                <div className="flex flex-row gap-3 bg-transparent p-0 hover:bg-transparent">
                                  <EthereumAddressToENSAvatar
                                    address={review.nullifier}
                                  />
                                  <p className="text-base font-body font-normal underline text-black dark:text-zinc-100">
                                    <EthereumAddressToENSName
                                      address={review.nullifier}
                                    />
                                  </p>
                                </div>
                              </VotingPowerPopover>
                            ) : null
                          ) : (
                            <div className="flex flex-row gap-3 items-center bg-transparent p-0 hover:bg-transparent">
                              <EthereumAddressToENSAvatar
                                address={review.nullifier}
                              />
                              <p className="text-base font-body font-normal text-black dark:text-white">
                                <EthereumAddressToENSName
                                  address={review.nullifier}
                                />
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="w-max text-base">
                          {formatDate(review.answers[0]?.createdAt)}{" "}
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-5">
                        {review.answers.map((answer) => (
                          <div
                            className="flex w-full flex-col justify-start border-l-2 border-zinc-300 pl-2.5"
                            key={answer.query}
                          >
                            <div className="mb-2 flex w-full flex-row items-start justify-between gap-1">
                              <div data-color-mode="light">
                                <MarkdownPreview
                                  className="text-base font-bold"
                                  components={{
                                    strong: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink {...props}>
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                    a: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink {...props}>
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                  }}
                                  source={answer.query}
                                />
                              </div>
                              {additionalQuestion(
                                answer.questionId,
                                answer.query
                              ) ? null : (
                                <p className="w-max min-w-max text-base font-normal">
                                  {Array.from(
                                    { length: answer.rating },
                                    (_, i) => (
                                      <span key={i}>★</span>
                                    )
                                  )}
                                </p>
                              )}
                            </div>

                            <p className="text-base font-normal">
                              {answer.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {reviews.map((review, index) => (
                    <div
                      className="flex flex-col items-start justify-start gap-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-4"
                      key={`${review.publicAddress}${+index}`}
                    >
                      <div className="flex w-full flex-row items-center justify-between gap-4">
                        <div className="flex flex-1 flex-row items-center justify-start gap-2">
                          <p className="text-base font-normal text-black dark:text-white">
                            Review by{" "}
                          </p>
                          {votingPowerCommunities.find(
                            (item) =>
                              item.toLowerCase() ===
                                grant?.community?.details?.data?.name?.toLowerCase() ||
                              item.toLowerCase() ===
                                grant?.community?.details?.data?.slug?.toLowerCase()
                          ) ? (
                            grant?.community ? (
                              <VotingPowerPopover
                                reviewer={review.publicAddress}
                                community={grant.community}
                              >
                                <div className="flex flex-row gap-3 bg-transparent p-0 hover:bg-transparent">
                                  <EthereumAddressToENSAvatar
                                    address={review.publicAddress}
                                  />
                                  <p className="text-base font-body font-normal underline text-black dark:text-zinc-100">
                                    <EthereumAddressToENSName
                                      address={review.publicAddress}
                                    />
                                  </p>
                                </div>
                              </VotingPowerPopover>
                            ) : null
                          ) : (
                            <div className="flex flex-row gap-3 items-center bg-transparent p-0 hover:bg-transparent">
                              <EthereumAddressToENSAvatar
                                address={review.publicAddress}
                              />
                              <p className="text-base font-body font-normal text-black dark:text-white">
                                <EthereumAddressToENSName
                                  address={review.publicAddress}
                                />
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="w-max text-base">
                          {formatDate(review.createdAt)}{" "}
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-5">
                        {review.answers.map((answer) => (
                          <div
                            className="flex w-full flex-col justify-start border-l-2 border-zinc-300 pl-2.5"
                            key={answer.query}
                          >
                            <div className="mb-2 flex w-full flex-row items-start justify-between gap-1">
                              <div data-color-mode="light">
                                <MarkdownPreview
                                  className="text-base font-bold"
                                  components={{
                                    strong: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink {...props}>
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                    a: ({ children, ...props }) => {
                                      return (
                                        <ExternalLink {...props}>
                                          {children}
                                        </ExternalLink>
                                      );
                                    },
                                  }}
                                  source={answer.query}
                                />
                              </div>
                              {additionalQuestion(
                                answer.questionId,
                                answer.query
                              ) ? null : (
                                <p className="w-max min-w-max text-base font-normal">
                                  {Array.from(
                                    { length: answer.rating },
                                    (_, i) => (
                                      <span key={i}>★</span>
                                    )
                                  )}
                                </p>
                              )}
                            </div>

                            <p className="text-base font-normal">
                              {answer.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {allReviews.length > pageLimit ? (
                    <Pagination
                      currentPage={page}
                      setCurrentPage={setPage}
                      postsPerPage={pageLimit}
                      totalPosts={allReviews.length}
                    />
                  ) : null}
                </>
              ) : (
                <div className="flex w-full flex-col items-center justify-center gap-2">
                  <p className="text-base font-normal">
                    {MESSAGES.GRANT.REVIEW.EMPTY_REVIEWS}
                  </p>
                  {grant && (
                    <Link
                      href={PAGES.PROJECT.TABS.REVIEW_THIS_GRANT(
                        project?.details?.data?.slug || project?.uid || "",
                        grant?.uid || ""
                      )}
                    >
                      <Button>Review this grant</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
