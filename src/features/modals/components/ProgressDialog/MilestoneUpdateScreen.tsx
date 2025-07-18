/* eslint-disable @next/next/no-img-element */
"use client";
import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { useProgressModalStore } from "@/store/modals/progress";
import {
  IGrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState } from "react";
import { Dropdown } from "./Dropdown";
import { NoGrant } from "./NoGrant";

export const MilestoneUpdateScreen = () => {
  const { project } = useProjectStore();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrant, setSelectedGrant] = useState<
    IGrantResponse | undefined
  >();
  const [selectedMilestone, setSelectedMilestone] = useState<
    IMilestoneResponse | undefined
  >();
  const grants: IGrantResponse[] = project?.grants || [];
  const { setProgressModalScreen } = useProgressModalStore();

  if (!grants.length && project) {
    return <NoGrant />;
  }
  const hasMilestones =
    selectedGrant?.milestones &&
    selectedGrant?.milestones?.length > 0 &&
    selectedGrant?.milestones?.some((milestone) => !milestone.completed);

  const GrantSelection = () => {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-black dark:text-zinc-100">
          Select Grant
        </label>
        <Dropdown
          list={grants.map((grant) => ({
            value: grant.details?.data.title || "",
            id: grant.uid,
            timestamp: grant.createdAt,
          }))}
          onSelectFunction={(value: string) => {
            const newGrant = grants.find((grant) => grant.uid === value);
            setSelectedGrant(newGrant);
            const availableMilestones = newGrant?.milestones.filter(
              (milestone) => !milestone.completed
            );
            if (availableMilestones && availableMilestones.length > 0) {
              setSelectedMilestone(availableMilestones[0]);
            } else {
              setSelectedMilestone(undefined);
            }
          }}
          type={"Grants"}
          selected={selectedGrant?.uid || ""}
        />
      </div>
    );
  };

  const MilestoneSelection = () => {
    const possibleMilestones = selectedGrant?.milestones.filter(
      (milestone) => !milestone.completed
    );
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-black dark:text-zinc-100">
          Select Milestone
        </label>
        {possibleMilestones?.length ? (
          <Dropdown
            list={possibleMilestones.map((milestone) => ({
              value: milestone.data.title || "",
              id: milestone.uid,
              timestamp: milestone.createdAt,
            }))}
            onSelectFunction={(value: string) => {
              const newMilestone = possibleMilestones.find(
                (milestone) => milestone.uid === value
              );
              setSelectedMilestone(newMilestone);
            }}
            type={"Milestones"}
            selected={selectedMilestone?.uid || ""}
          />
        ) : null}
      </div>
    );
  };

  if (selectedGrant && !hasMilestones) {
    return (
      <div className="flex flex-col gap-2">
        <GrantSelection />
        <div className="flex w-full flex-col items-center justify-center gap-4 rounded border border-gray-200 bg-blue-50 dark:bg-zinc-800 p-4">
          <img
            src="/images/comments.png"
            alt="Milestone achievements"
            className="h-[185px] w-[438px] object-cover"
          />
          <p className="text-base font-normal text-black max-sm:text-sm dark:text-white">
            Create a new milestone for forthcoming work
          </p>
          <div className="flex flex-row justify-start gap-4 max-sm:w-full max-sm:flex-col">
            <Button
              onClick={() => {
                setProgressModalScreen("milestone");
              }}
              className="flex h-max w-max  flex-row items-center  hover:opacity-75 justify-center gap-3 rounded border border-[#155EEF] bg-[#155EEF] px-3 py-1 text-sm font-semibold text-white   max-sm:w-full"
            >
              <p>Add a new milestone</p>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <GrantSelection />
      {selectedGrant ? <MilestoneSelection /> : null}
      <div className="flex flex-col gap-2">
        {selectedMilestone ? (
          <MilestoneUpdateForm
            // grant={selectedGrant}
            milestone={selectedMilestone}
            isEditing={false}
            afterSubmit={() => {
              closeProgressModal();
            }}
            cancelEditing={() => {
              setSelectedMilestone(undefined);
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
