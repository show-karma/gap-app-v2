/* eslint-disable @next/next/no-img-element */
"use client";
import { MilestoneUpdateForm } from "@/components/Forms/MilestoneUpdate";
import { Button } from "@/components/Utilities/Button";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { PAGES } from "@/utilities/pages";
import {
  IGrantResponse,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const MilestoneUpdateScreen = () => {
  const { project } = useProjectStore();
  const router = useRouter();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrant, setSelectedGrant] = useState<
    IGrantResponse | undefined
  >();
  const [selectedMilestone, setSelectedMilestone] = useState<
    IMilestoneResponse | undefined
  >();
  const grants: IGrantResponse[] = project?.grants || [];
  if (!grants.length && project) {
    return (
      <div
        className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
        style={{
          border: "dashed 2px #155EEF",
        }}
      >
        <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
          Go ahead and create your first grant
        </p>
        <button
          type="button"
          className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
          //   onClick={() => {
          //     changeTab("create-grant");
          //   }}
          onClick={() => {
            router.push(
              PAGES.PROJECT.TABS.SELECTED_TAB(
                project.details?.data.slug || project.uid,
                "create-grant"
              )
            );
            closeProgressModal();
          }}
        >
          <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
          Add a Grant
        </button>
      </div>
    );
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
        <select
          value={selectedGrant?.uid}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
        >
          <option value={undefined} disabled className="text-gray-400">
            Select Grant
          </option>
          {grants.map((grant) => (
            <option
              key={grant.uid}
              value={grant.uid}
              onClick={() => setSelectedGrant(grant)}
            >
              {grant.details?.data.title}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const MilestoneSelection = () => {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-black dark:text-zinc-100">
          Select Milestone
        </label>
        <select
          value={selectedMilestone?.uid}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
        >
          <option
            value={undefined}
            disabled
            onClick={() => setSelectedMilestone(undefined)}
            className="text-gray-400"
          >
            Select Milestone
          </option>
          {selectedGrant?.milestones?.map((milestone) => (
            <option
              key={milestone.uid}
              value={milestone.uid}
              onClick={() => setSelectedMilestone(milestone)}
            >
              {milestone?.data?.title}
            </option>
          ))}
        </select>
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
                router.push(
                  PAGES.PROJECT.TABS.SELECTED_TAB(
                    (project?.details?.data.slug || project?.uid) as string,
                    selectedGrant?.uid,
                    "create-milestone"
                  )
                );
                closeProgressModal();
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
