"use client";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";

import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ObjectiveCardComplete } from "./Completion";

const ObjectiveOptionsMenu = dynamic(
  () => import("./Options").then((mod) => mod.ObjectiveOptionsMenu),
  {
    ssr: false,
  }
);

const ProjectObjectiveCompletion = dynamic(
  () =>
    import("@/components/Forms/ProjectObjectiveCompletion").then(
      (mod) => mod.ProjectObjectiveCompletionForm
    ),
  {
    ssr: false,
  }
);

interface ObjectiveCardProps {
  objective: IProjectMilestoneResponse;
  isAuthorized: boolean;
}

export const ObjectiveCard = ({
  objective,
  isAuthorized,
}: ObjectiveCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleting = (isCompleting: boolean) => {
    setIsCompleting(isCompleting);
  };

  return (
    <div
      className={`border ${
        objective.completed
          ? "border-brand-blue"
          : "border-[#D0D5DD] dark:border-zinc-400"
      } bg-white dark:bg-zinc-800 rounded-xl p-6 gap-3 flex flex-col items-start justify-start`}
    >
      <div className="flex flex-row gap-3 items-start justify-between w-full">
        <div className="flex flex-row gap-3 items-center max-lg:flex-col-reverse max-lg:items-start max-lg:gap-2 w-full">
          <p
            className="text-xl font-bold text-[#101828] dark:text-zinc-100 pl-4 border-l-4"
            style={{
              borderLeftColor: objective.completed ? "#2ED3B7" : "#FDB022",
            }}
          >
            {objective.data.title}
          </p>
          {objective.completed ? (
            <p className="px-2 py-0.5 bg-brand-blue text-white rounded-full text-xs">
              Completed
            </p>
          ) : null}
        </div>
        {isAuthorized ? (
          <ObjectiveOptionsMenu
            objectiveId={objective.uid}
            completeFn={handleCompleting}
            alreadyCompleted={!!objective.completed}
          />
        ) : null}
      </div>
      <ReadMore side="left">{objective.data.text}</ReadMore>
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <p className="text-zinc-800 dark:text-zinc-300 text-sm lg:text-base">
            Posted on {formatDate(objective.createdAt)} by
          </p>
          <div className="flex flex-row gap-1 items-center">
            <EthereumAddressToENSAvatar
              address={objective.attester}
              className="h-5 w-5 min-h-5 min-w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900"
            />
            <p className="text-sm text-center font-bold text-black dark:text-zinc-200 max-2xl:text-[13px]">
              <EthereumAddressToENSName address={objective.attester} />
            </p>
          </div>
        </div>
        {!objective.completed ? (
          <p className="px-3 py-1 bg-[#FFFAEB] text-[#B54708] dark:bg-[#FFFAEB]/10 dark:text-orange-100 rounded-full text-sm border border-[#FEDF89]">
            Pending
          </p>
        ) : null}
      </div>
      {isCompleting ||
      objective.completed?.data?.reason ||
      objective.completed?.data?.proofOfWork ? (
        <div className="w-full flex-col flex gap-2 px-4 py-2 bg-[#F8F9FC] dark:bg-zinc-700 rounded-lg">
          <ObjectiveCardComplete
            objective={objective}
            isCompleting={isCompleting}
            handleCompleting={handleCompleting}
          />
        </div>
      ) : null}
    </div>
  );
};
