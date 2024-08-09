"use client";
import { useState } from "react";
import { formatDate } from "@/utilities/formatDate";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import {
  CardReview,
  CardReviewMode,
} from "@/components/Pages/Project/Review/CardReview";
import { ChevronDown } from "@/components/Icons";

export const NavbarReview = () => {
  const [isStarSelected, setIsStarSelected] = useState<number | null>(null); // ID

  interface MiniReviewSummaryProps {
    id: number;
    date: number; // UNIX Timestamp
    scoreMedia: number;
  }

  const MiniReviewSummary: MiniReviewSummaryProps[] = [
    {
      id: 1,
      date: 1620414884, // 07 May, 2021 in Unix timestamp
      scoreMedia: 4.6,
    },
    {
      id: 2,
      date: 1673723684, // 14 January, 2023 in Unix timestamp
      scoreMedia: 4.4,
    },
    {
      id: 3,
      date: 1498072484, // 21 Jun 2017 in Unix timestamp
      scoreMedia: 4.1,
    },
    {
      id: 4,
      date: 1351188884, // 25 Oct 2012 in Unix timestamp
      scoreMedia: 4.9,
    },
    {
      id: 5,
      date: 1719792000, // 1 July, 2024 in Unix timestamp
      scoreMedia: 4.9,
    },
    {
      id: 6,
      date: 1672531200, // 1 January, 2023 in Unix timestamp
      scoreMedia: 4.9,
    },
    {
      id: 7,
      date: 1356998400, // 1 January, 2013 in Unix timestamp
      scoreMedia: 4.9,
    },
  ];

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex px-2 gap-2 overflow-x-auto pb-4 relative">
        {MiniReviewSummary.sort((a, b) => b.date - a.date).map(
          (miniReview: MiniReviewSummaryProps, index: number) => (
            <div
              key={miniReview.id}
              className="flex flex-col justify-center items-center text-center relative"
            >
              <p className="w-full">
                {formatDate(new Date(miniReview.date * 1000))}
              </p>
              <div className="w-full flex flex-col items-center sm:px-14 px-4">
                <StarReviewIcon
                  props={{
                    className: `w-20 h-20 ${
                      isStarSelected === index && "text-[#004EEB]"
                    }`,
                  }}
                  pathProps={{
                    className: "cursor-pointer",
                    fill: `${isStarSelected === index && "#004EEB"} `,
                    onClick: () => {
                      setIsStarSelected((prev) =>
                        prev === index ? null : index
                      );
                    },
                  }}
                />
                <p>{miniReview.scoreMedia}</p>
                {isStarSelected === index && (
                  <div>
                    <ChevronDown />
                  </div>
                )}
                {index < MiniReviewSummary.length - 1 && (
                  <div className="absolute right-0 top-1/2 h-3/4 w-[2px] bg-zinc-300 transform -translate-y-1/2"></div>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && (
          <CardReview id={isStarSelected} mode={CardReviewMode.READ} />
        )}
      </div>
    </div>
  );
};
