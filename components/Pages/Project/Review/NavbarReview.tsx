"use client";
import { useState } from "react";
import { formatDate } from "@/utilities/formatDate";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { CardReview } from "@/components/Pages/Project/Review/CardReview";
import { ChevronDown } from "@/components/Icons";
import { Review, useReviewStore } from "@/store/review";

export const NavbarReview = () => {
  const [isStarSelected, setIsStarSelected] = useState<number | null>(null); // ID
  const review = useReviewStore((state) => state.review);

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex px-2 gap-2 overflow-x-auto pb-4 relative">
        {review
          .sort((a, b) => b.date - a.date)
          .map((miniReview: Review, index: number) => (
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
                <p>{miniReview.averageScore}</p>
                {isStarSelected === index && (
                  <div>
                    <ChevronDown />
                  </div>
                )}
                {index < review.length - 1 && (
                  <div className="absolute right-0 top-1/2 h-3/4 w-[2px] bg-zinc-300 transform -translate-y-1/2"></div>
                )}
              </div>
            </div>
          ))}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && <CardReview id={isStarSelected} />}
      </div>
    </div>
  );
};
