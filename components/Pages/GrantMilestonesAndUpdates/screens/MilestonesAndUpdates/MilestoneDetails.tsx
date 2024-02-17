"use client";

import { ReadMore, formatDate } from "@/utilities";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { type FC } from "react";
import { Updates } from "./Updates";
import { MilestoneDelete } from "./MilestoneDelete";
import { useOwnerStore, useProjectStore } from "@/store";

interface MilestoneDateStatusProps {
  milestone: Milestone;
}

const statusDictionary = {
  approved: "Approved",
  completed: "Completed",
  rejected: "Rejected",
  pending: "Pending",
  "past due": "Past Due",
};

const statusBg = {
  approved: "bg-green-600",
  rejected: "bg-red-600",
  completed: "bg-blue-600",
  pending: "bg-gray-500",
  "past due": "bg-red-600",
};

const FlagIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" x2="4" y1="22" y2="15"></line>
    </svg>
  );
};

export const MilestoneDateStatus: FC<MilestoneDateStatusProps> = ({
  milestone,
}) => {
  const getMilestoneStatus = () => {
    if (milestone.approved) return "approved";
    if (milestone.rejected) return "rejected";
    if (milestone.completed) return "completed";
    if (milestone.endsAt < Date.now() / 1000) return "past due";
    return "pending";
  };

  const status = getMilestoneStatus();

  return (
    <div className="flex w-max flex-row items-center justify-center gap-4 max-lg:justify-start">
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Due on {formatDate(milestone.endsAt * 1000)}
      </p>
      <div
        className={`flex items-center justify-start rounded-2xl px-2 py-1 ${statusBg[status]}`}
      >
        <p className="text-center text-xs font-medium leading-none text-white">
          {statusDictionary[status]}
        </p>
      </div>
    </div>
  );
};

interface MilestoneTagProps {
  index: number;
}
export const MilestoneTag: FC<MilestoneTagProps> = ({ index }) => {
  return (
    <div className="flex w-max flex-row gap-3 rounded-full bg-[#F5F3FF] dark:bg-zinc-900 px-3 py-1 text-[#5720B7] dark:text-violet-100">
      <FlagIcon />
      <p className="text-xs font-bold">MILESTONE {index}</p>
    </div>
  );
};

interface MilestoneDetailsProps {
  milestone: Milestone;
  index: number;
  isCommunityAdmin: boolean;
}

export const MilestoneDetails: FC<MilestoneDetailsProps> = ({
  milestone,
  index,
  isCommunityAdmin,
}) => {
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white dark:bg-zinc-800 transition-all duration-200 ease-in-out">
        <div
          className="flex w-full flex-col py-4"
          style={{
            borderBottom:
              isAuthorized ||
              milestone?.completed?.reason ||
              (isCommunityAdmin && milestone?.completed)
                ? "1px solid #CCCCCC"
                : "none",
          }}
        >
          <div className="flex w-full flex-row items-start justify-between px-4 max-lg:mb-4 max-lg:flex-col">
            <div className="flex flex-col gap-3">
              <MilestoneTag index={index} />
              <h4 className="text-base font-bold leading-normal text-gray-700 dark:text-zinc-100">
                {milestone.title}
              </h4>
            </div>
            <div className="flex flex-row items-center justify-start gap-2">
              <MilestoneDateStatus milestone={milestone} />
              {isAuthorized ? <MilestoneDelete milestone={milestone} /> : null}
            </div>
          </div>
          <div
            className="flex flex-col gap-2 px-4  pb-3 max-lg:max-w-xl max-sm:max-w-[300px]"
            data-color-mode="light"
          >
            <ReadMore
              readLessText="Read less milestone description"
              readMoreText="Read full milestone description"
            >
              {milestone.description}
            </ReadMore>
          </div>
        </div>
        {(isAuthorized || milestone?.completed?.reason) && (
          <div className="mx-6 mt-4 rounded-lg bg-transparent pb-4">
            <Updates milestone={milestone} />
          </div>
        )}
      </div>
    </div>
  );
};
