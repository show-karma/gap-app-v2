"use client";

import { BadgeIcon, BadgeName } from "@/components/Icons/Badge";
import { Button } from "@/components/Utilities/Button";
import { DynamicStars } from "@/components/Utilities/DynamicStars";
import React from "react";

interface CardReviewDataProps {
  id: number;
}

interface BadgeListProps {
  icon: React.ReactNode;
  description: string;
  score: React.ReactNode;
}

export const CardReview = (data: CardReviewDataProps) => {
  const badgeList: BadgeListProps[][] = [
    [
      {
        icon: <BadgeIcon badgeName={BadgeName.CLEAR_GOALS} />,
        description:
          "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.SMOOTH_APPLICATION} />,
        description:
          "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.FAIR_ROUNDS} />,
        description:
          "Fair rounds: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sem urna, sodales vel placerat sed, elementum a orci. Duis sit amet neque rutrum, suscipit enim tempus, dignissim erat. Etiam interdum dignissim pretium.",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.EASY_TEACH} />,
        description:
          "Easy Tech: Awards programs with easily implementable technology. How hard is the tech? Are the docs easy to use or find?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.SUPPORTIVE_TEAM} />,
        description:
          "Supportive Team: Highlights programs with highly supportive teams. Whether technical or not, if you receive very helpful support after applying for a grant, issue this badge. – Post-Grant Support: Highlights strong post-grant support. How much do they help you after the application? Do they suggest related projects, possible connections, or interested people?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.GREAT_REVIEWERS} />,
        description:
          "Great Reviewers: Recognizes top-quality grant reviewers. They are impartial, select well-written projects, set clear goals, and explain the application process well.",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.FAST_DISBURSEMENT} />,
        description:
          "Fast Disbursement: Commends quick fund disbursement processes. Did they complete the payment as soon as you completed the milestones? If yes, issue this badge.",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
    ],
    [
      {
        icon: <BadgeIcon badgeName={BadgeName.CLEAR_GOALS} />,
        description:
          "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.SMOOTH_APPLICATION} />,
        description:
          "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
      {
        icon: <BadgeIcon badgeName={BadgeName.SMOOTH_APPLICATION} />,
        description:
          "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
    ],
    [
      {
        icon: <BadgeIcon badgeName={BadgeName.CLEAR_GOALS} />,
        description:
          "Clear Goals: Recognizes programs with well-defined goals. Every grant program has a goal, such as governance, impact, or education. Are these goals well explained so you can build a project aligned with them?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
    ],
    [
      {
        icon: <BadgeIcon badgeName={BadgeName.SMOOTH_APPLICATION} />,
        description:
          "Smooth Application: Awards a seamless application process. Are they using a tech that facilitates the application process? Did they get back to you after the application, or was it just a poor form?",
        score: <DynamicStars totalStars={5} rating={0} setRating={() => {}} />,
      },
    ],
  ];

  const selectedBadgeList = badgeList[data.id] || [];

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {selectedBadgeList.map((badge: BadgeListProps, index: number) => (
          <div key={index} className="flex flex-col w-full">
            <div className="flex flex-row w-full items-center gap-2">
              <div className="flex">{badge.icon}</div>
              <div className="flex">{badge.description}</div>
              <div className="flex">{badge.score}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end w-full">
        <Button>Submit Review</Button>
      </div>
    </div>
  );
};
