"use client";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { useState } from "react";
import { CardReview } from "./CardReview";

export const CardReviewSummary = () => {
  const [isStarSelected, setIsStarSelected] = useState<boolean>(false);

  interface MiniReviewSummaryProps {
    date: string;
    icon: React.ReactNode;
    score: number;
  }

  const MiniReviewSummary: MiniReviewSummaryProps[] = [
    {
      date: "18/07/2024",
      icon: <StarReviewIcon className="w-20 h-20" />,
      score: 4.6,
    },
    {
      date: "18/07/2024",
      icon: <StarReviewIcon className="w-20 h-20" />,
      score: 4.6,
    },
    {
      date: "18/07/2024",
      icon: <StarReviewIcon className="w-20 h-20" />,
      score: 4.6,
    },
    {
      date: "18/07/2024",
      icon: <StarReviewIcon className="w-20 h-20" />,
      score: 4.6,
    },
  ];

  return (
    <>
      <div className="w-full flex flex-col">
        <div className="w-full flex px-2 gap-2">
          {MiniReviewSummary.map(
            (miniReview: MiniReviewSummaryProps, index: number) => (
              <>
                <div
                  key={index}
                  className="w-fit flex flex-col justify-center items-center"
                  onClick={() => {
                    setIsStarSelected(!isStarSelected);
                  }}
                >
                  <p>{miniReview.date}</p>
                  {miniReview.icon}
                  <p> {miniReview.score}</p>
                </div>
              </>
            )
          )}
        </div>
        <div className="w-full flex">{isStarSelected && <CardReview />}</div>
      </div>
    </>
  );
};
