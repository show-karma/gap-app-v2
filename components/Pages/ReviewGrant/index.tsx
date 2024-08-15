"use client";
/* eslint-disable no-nested-ternary */

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { type FC, useEffect, useState, Suspense } from "react";
import { useAccount } from "wagmi";

import { ReviewForm } from "./ReviewForm";
import { ReviewFormAnon } from "./ReviewFormAnon";

import { useProjectStore } from "@/store";
import { Question } from "@/types";
import { ReviewerInfo } from "@/types/reviewer";
import fetchData from "@/utilities/fetchData";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/Utilities/Button";
import { INDEXER } from "@/utilities/indexer";
import { getQuestionsOf, hasAlreadyReviewed } from "@/utilities/sdk";
import { additionalQuestion } from "@/utilities/tabs";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import { useSearchParams } from "next/navigation";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/ErrorManager";

interface ReviewGrantProps {
  grant: IGrantResponse | undefined;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export const ReviewGrant: FC<ReviewGrantProps> = ({ grant }) => {
  const searchParams = useSearchParams();

  const [zkgroup, setZkGroup] = useState<any>(null);

  const { isConnected } = useAccount();
  const { isAuth } = useAuthStore();
  const { openConnectModal } = useConnectModal();
  const loading = useProjectStore((state) => state.loading);
  const { address } = useAccount();

  const [isFetching, setIsFetching] = useState(true);
  const [isAnonReview, setIsAnonReview] = useState(false);
  const [proof, setProof] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false);

  const [reviewerInfo, setReviewerInfo] = useState<ReviewerInfo>({
    choice: undefined,
    name: undefined,
    email: undefined,
    categories: undefined,
  });

  // useEffect(() => {
  //   const proofEncoded = searchParams.get("proof");
  //   if (proofEncoded) {
  //     console.log("Proof received", proofEncoded);
  //     setProof(JSON.parse(atob(proofEncoded)));
  //   } else {
  //     console.log("No proof received");
  //   }
  // }, []);

  // useEffect(() => {
  //   if (!grant) return;
  //   // Check if zkgroup exists for the grant
  //   (async () => {
  //     try {
  //       const [data] = await fetchData(
  //         INDEXER.GRANTS.GET_ZK_GROUP(
  //           String(grant?.chainID),
  //           grant?.communityUID,
  //           String(grant?.uid),
  //           "1"
  //         )
  //       );

  //       if (data) {
  //         console.log(
  //           `zkgroup: ${JSON.stringify(data)} found for this grant`,
  //           data
  //         );
  //         setZkGroup(data);
  //       }
  //     } catch (error) {
  //       console.error("Error in finding zkgroup for this grant", error);
  //     }
  //   })();
  // }, [grant]);

  useEffect(() => {
    if (!address) return;
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
        errorManager(`Error getting reviewer info of user ${address}`, error);
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
        // turn additional to last
        const dataWithoutAdditional = data.filter((question: any) => {
          return additionalQuestion(question?.id, question?.query) === false;
        });
        const additionals = data.filter(
          (question: any) =>
            additionalQuestion(question?.id, question?.query) === true
        );

        const allQuestions = [...dataWithoutAdditional, ...additionals];
        setQuestions(allQuestions);
      } catch (error) {
        errorManager(`Error getting questions of grant ${grant.uid}`, error);
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
          errorManager(
            `Error getting already reviewed of user ${address} for grant ${grant.uid}`,
            error
          );
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

  if (!isConnected || !isAuth) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p>Please, connect your wallet.</p>
        <Button onClick={openConnectModal}>Connect wallet</Button>
      </div>
    );
    // Check if zkgroup is enabled for this grant
    //   return !zkgroup ? (
    //     <div className="flex flex-1 flex-col items-center justify-center gap-3">
    //       <p>Please, connect your wallet.</p>
    //       <Button onClick={openConnectModal}>Connect wallet</Button>
    //     </div>
    //   ) : (
    //     // Render this when no wallet is connected
    //     <div className="space-y-5 flex w-full justify-start">
    //       <div className="flex w-full max-w-5xl flex-col items-start justify-start gap-1">
    //         <div className="flex w-full flex-row items-center justify-between gap-2">
    //           <div className="flex w-full flex-col items-start justify-between gap-6  border-b border-b-zinc-300 pb-8">
    //             <h2 className="text-2xl font-normal">Review Grant</h2>
    //             <div className="flex flex-col gap-2">
    //               <h3 className="text-lg font-bold">Goal of review</h3>
    //               <p>
    //                 {`The purpose of the review is to evaluate the extent to which the
    // contributions of grantees have aligned with and advanced the
    // DAO's mission of spearheading the evolution of decentralized
    // technologies and governance.`}
    //               </p>
    //               <p>
    //                 {`This review aims to assess the impact, relevance, and
    // effectiveness of the grantees' past work in supporting the DAO's
    // objectives, ensuring that the retroactive funding recognizes and
    // encourages meaningful and impactful contributions within the DAO
    // ecosystem.`}
    //               </p>
    //             </div>
    //           </div>
    //         </div>
    //         {loading || isFetching ? (
    //           <div className="flex w-full items-center justify-center">
    //             <Spinner />
    //           </div>
    //         ) : questions.length && grant && zkgroup ? (
    //           <div className="mt-4 flex w-full flex-col justify-start gap-4 rounded-lg px-3">
    //             <ReviewFormAnon
    //               grant={grant}
    //               allQuestions={questions}
    //               alreadyReviewed={alreadyReviewed}
    //               reviewerInfo={reviewerInfo}
    //               zkgroup={zkgroup}
    //             />
    //           </div>
    //         ) : (
    //           <p>{MESSAGES.GRANT.REVIEW.CAN_NOT_REVIEW}</p>
    //         )}
    //       </div>
    //     </div>
    //   );
  }

  // const hasSpecific = grant.categories?.find(
  //   (category) => specificCategoriesAndQuestions[category]
  // );

  return (
    <div className="space-y-5 flex w-full justify-start">
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
          // ) : questions.length && grant && zkgroup ? (
          <div className="mt-4 flex w-full flex-col justify-start gap-4 rounded-lg px-3">
            {/* {!proof && (
              <div className="flex">
                <Switch
                  checked={isAnonReview}
                  onChange={setIsAnonReview}
                  className={classNames(
                    isAnonReview ? "bg-blue-600" : "bg-gray-200",
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  )}
                >
                  <span className="sr-only">Use setting</span>
                  <span
                    aria-hidden="true"
                    className={classNames(
                      isAnonReview ? "translate-x-5" : "translate-x-0",
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    )}
                  />
                </Switch>
                <h5 className="ml-3">
                  Review this grant anonymously? (Using AnonKarma zkGroups)
                </h5>
              </div>
            )} */}

            {/* {isAnonReview ? (
              <ReviewFormAnon
                grant={grant}
                allQuestions={questions}
                alreadyReviewed={alreadyReviewed}
                reviewerInfo={reviewerInfo}
                zkgroup={zkgroup}
              />
            ) : proof ? (
              <ReviewFormAnon
                grant={grant}
                allQuestions={questions}
                alreadyReviewed={alreadyReviewed}
                reviewerInfo={reviewerInfo}
                zkgroup={zkgroup}
              />
            ) : (
              <ReviewForm
                grant={grant}
                allQuestions={questions}
                alreadyReviewed={alreadyReviewed}
                reviewerInfo={reviewerInfo}
              />
              )} */}
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
