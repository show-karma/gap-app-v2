"use client";
import { StarReviewIcon } from "@/components/Icons/StarReview";
import { useState } from "react";
import { CardReview } from "./CardReview";
import { ChevronDown } from "@/components/Icons";
import { formatDate } from "@/utilities/formatDate";

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
      date: 1727136000, // 24 July, 2024 in Unix timestamp
      scoreMedia: 4.6,
    },
    {
      id: 2,
      date: 1727222400, // 25 July, 2024 in Unix timestamp
      scoreMedia: 4.4,
    },
    {
      id: 3,
      date: 1727308800, // 26 July, 2024 in Unix timestamp
      scoreMedia: 4.1,
    },
    {
      id: 4,
      date: 1727395200, // 27 July, 2024 in Unix timestamp
      scoreMedia: 4.9,
    },
  ];

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex px-2 gap-2 overflow-x-auto">
        {MiniReviewSummary.sort((a, b) => b.date - a.date).map(
          (miniReview: MiniReviewSummaryProps, index: number) => (
            <div
              key={miniReview.id}
              className={`w-full flex flex-col justify-center sm:px-14 px-4 items-center text-center ${
                MiniReviewSummary.length - 1 !== index &&
                "border-r border-b-zinc-300"
              }`}
            >
              <p className="w-full">
                {formatDate(new Date(miniReview.date * 1000))}
              </p>
              <StarReviewIcon
                props={{
                  className: `w-20 h-20 ${
                    isStarSelected === index && "text-[#004EEB]"
                  }`,
                }}
                pathProps={{
                  className: "cursor-pointer",
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
            </div>
          )
        )}
      </div>
      <div className="w-full flex flex-col">
        {isStarSelected !== null && (
          <CardReview
            id={isStarSelected}
            editableReview={true}
            // newReview={false}
          />
        )}
        {/*         
        // : (
        //   <CardReview
        //     id={99999999999} // get the last index from data and add + 1 to be the last one created.
        //     editableReview={true}
        //     newReview={true}
        //   />
        // ) */}
      </div>
    </div>
  );
};
