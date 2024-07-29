"use client";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { useState } from "react";
import { CardReview } from "./CardReview";
import { ChevronDown } from "@/components/Icons";

export const CardReviewSummary = () => {
  const [isStarSelected, setIsStarSelected] = useState<number | null>(null); // ID

  interface MiniReviewSummaryProps {
    id: number;
    date: string;
    score: number;
  }

  const MiniReviewSummary: MiniReviewSummaryProps[] = [
    {
      id: 1,
      date: "24 July, 2024",
      score: 4.6,
    },
    {
      id: 2,
      date: "25 July, 2024",
      score: 4.4,
    },
    {
      id: 3,
      date: "26 July, 2024",
      score: 4.1,
    },
    {
      id: 4,
      date: "27 July, 2024",
      score: 4.9,
    },
  ];

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex px-2 gap-2 ">
        {MiniReviewSummary.map(
          (miniReview: MiniReviewSummaryProps, index: number) => (
            <div
              key={miniReview.id}
              className={`w-fit flex flex-col justify-center items-center px-10 ${
                MiniReviewSummary.length - 1 !== index &&
                "border-r border-b-zinc-300"
              }`}
            >
              <p>{miniReview.date}</p>
              <StarReviewIcon
                props={{
                  className: `w-20 h-20 ${
                    isStarSelected === index && "text-[#004EEB]"
                  }`,
                }}
                pathProps={{
                  className: "cursor-pointer",
                  onClick: () => {
                    setIsStarSelected(index);
                  },
                }}
              />
              <p>{miniReview.score}</p>
              {isStarSelected === index && (
                <div>
                  <ChevronDown />
                </div>
              )}
            </div>
          )
        )}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && <CardReview id={isStarSelected} />}
      </div>
    </div>
  );
};
