"use client";
import { CardReviewSummary } from "./CardReviewSummary";

export const NavbarReview = () => {
  return (
    <div className="flex w-full flex-col justify-center">
      <div className="w-full flex flex-row px-2">
        <div className="flex flex-row w-full">
          <CardReviewSummary />
        </div>
      </div>
    </div>
  );
};
