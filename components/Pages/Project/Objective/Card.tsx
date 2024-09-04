"use client";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";

import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import dynamic from "next/dynamic";
import { useState } from "react";

const ObjectiveOptionsMenu = dynamic(
  () => import("./Options").then((mod) => mod.ObjectiveOptionsMenu),
  {
    ssr: false,
  }
);

const ProjectObjectiveForm = dynamic(
  () =>
    import("@/components/Forms/ProjectObjective").then(
      (mod) => mod.ProjectObjectiveForm
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
  const [isEditing, setIsEditing] = useState(false);

  const handleEditing = (isEditing: boolean) => {
    setIsEditing(isEditing);
  };

  return isEditing ? (
    <ProjectObjectiveForm
      stateHandler={handleEditing}
      previousObjective={objective}
    />
  ) : (
    <div className="border border-[#D0D5DD] dark:border-zinc-400 rounded-xl p-6 gap-3 flex flex-col items-start justify-start">
      <div className="flex flex-row gap-3 items-center justify-between w-full">
        <div className="flex flex-row gap-3 items-center">
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
            editFn={handleEditing}
          />
        ) : null}
      </div>
      <ReadMore>{objective.data.text}</ReadMore>
      <div className="flex flex-row gap-4 items-center justify-between w-full">
        <div className="flex flex-row gap-2 items-center">
          <p>Posted on {formatDate(objective.createdAt)} by</p>
          <div className="flex flex-row gap-1 items-center">
            <EthereumAddressToENSAvatar
              address={objective.attester}
              className="h-5 w-5 rounded-full border-1 border-gray-100 dark:border-zinc-900"
            />
            <p className="text-sm text-center font-bold text-black dark:text-zinc-200 max-2xl:text-[13px]">
              <EthereumAddressToENSName address={objective.attester} />
            </p>
          </div>
        </div>
        {!objective.completed ? (
          <p className="px-3 py-1 bg-[#FFFAEB] text-[#B54708] rounded-full text-sm border border-[#FEDF89]">
            Pending
          </p>
        ) : null}
      </div>
    </div>
  );
};
