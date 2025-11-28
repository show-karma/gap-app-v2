"use client";

import type { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC } from "react";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { MilestoneDelete } from "./MilestoneDelete";
import { Updates } from "./Updates";

interface MilestoneDateStatusProps {
  milestone: IMilestoneResponse;
}

const statusDictionary = {
  completed: "Completed",
  pending: "Pending",
  "past due": "Past Due",
};

const statusBg = {
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

export const MilestoneDateStatus: FC<MilestoneDateStatusProps> = ({ milestone }) => {
  const getMilestoneStatus = () => {
    if (milestone.completed) return "completed";
    if (milestone.data.endsAt < Date.now() / 1000) return "past due";
    return "pending";
  };

  const status = getMilestoneStatus();

  return (
    <div className="flex max-w-full w-max max-lg:w-full flex-row items-center justify-center gap-4 max-lg:justify-start flex-wrap">
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        {milestone.data.startsAt
          ? `${formatDate(milestone.data.startsAt * 1000)} - ${formatDate(
              milestone.data.endsAt * 1000
            )}`
          : `Due on ${formatDate(milestone.data.endsAt * 1000)}`}
      </p>
      <div className={`flex items-center justify-start rounded-2xl px-2 py-1 ${statusBg[status]}`}>
        <p className="text-center text-xs font-medium leading-none text-white">
          {statusDictionary[status]}
        </p>
      </div>
    </div>
  );
};

interface MilestoneTagProps {
  index: number;
  priority?: number;
}
export const MilestoneTag: FC<MilestoneTagProps> = ({ index, priority }) => {
  return (
    <div className="flex flex-row gap-3">
      <div className="flex w-max flex-row gap-3 rounded-full bg-[#F5F3FF] dark:bg-zinc-900 px-3 py-1 text-[#5720B7] dark:text-violet-100">
        <FlagIcon />
        <p className="text-xs font-bold">MILESTONE {index}</p>
      </div>
      {priority ? (
        <div className="flex w-max flex-row gap-3 rounded-full bg-slate-100 dark:bg-zinc-700 px-3 py-1 text-zinc-700 dark:text-zinc-100">
          <p className="text-xs font-bold">PRIORITY {priority}</p>
        </div>
      ) : null}
    </div>
  );
};

interface MilestoneDetailsProps {
  milestone: IMilestoneResponse;
  index: number;
}

export const MilestoneDetails: FC<MilestoneDetailsProps> = ({ milestone, index }) => {
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full flex-1 flex-col rounded-lg border border-zinc-200 bg-white dark:bg-zinc-800 transition-all duration-200 ease-in-out">
        <div
          className="flex w-full flex-col py-4"
          style={{
            borderBottom:
              (isAuthorized && !milestone.completed) ||
              milestone?.completed?.data?.reason ||
              (isCommunityAdmin && !milestone?.completed)
                ? "1px solid #CCCCCC"
                : "none",
          }}
        >
          <div className="flex w-full flex-row items-start justify-between px-4 max-lg:mb-4 max-lg:flex-col">
            <div className="flex flex-col gap-3">
              <MilestoneTag index={index} priority={milestone?.data?.priority} />
              <h4 className="text-base font-bold leading-normal text-black dark:text-zinc-100">
                {milestone.data.title}
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
              {milestone.data.description}
            </ReadMore>
          </div>
        </div>
        {((isAuthorized && !milestone?.completed) ||
          milestone?.completed?.data?.reason ||
          milestone?.completed?.data?.proofOfWork) && (
          <div className="mx-6 mt-4 rounded-lg bg-transparent pb-4">
            <Updates milestone={milestone} />
          </div>
        )}
      </div>
    </div>
  );
};
