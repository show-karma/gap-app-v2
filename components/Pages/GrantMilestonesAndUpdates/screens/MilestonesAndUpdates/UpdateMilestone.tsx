/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useOwnerStore, useProjectStore } from "@/store";
import { MESSAGES, getProjectById, useSigner } from "@/utilities";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useNetwork, useSwitchNetwork } from "wagmi";

interface NotUpdatingCaseProps {
  milestone: Milestone;
  isAuthorized: boolean;
  setIsUpdating: (value: boolean) => void;
}

const NotUpdatingCase: FC<NotUpdatingCaseProps> = ({
  milestone,
  isAuthorized,
  setIsUpdating,
}) => {
  if (!isAuthorized) {
    return undefined;
  }
  return (
    <div className="flex flex-row items-center justify-end ">
      {!milestone.completed && !milestone.approved && milestone ? (
        <Button
          className="flex items-center justify-center gap-2 rounded border border-blue-600 bg-brand-blue dark:bg-primary-700 dark:text-zinc-200 px-4 py-2.5 hover:bg-brand-blue"
          onClick={() => setIsUpdating(true)}
        >
          <p className="text-sm font-semibold text-white">Post an update</p>
          <PencilSquareIcon className="relative h-5 w-5" />
        </Button>
      ) : null}
    </div>
  );
};

interface UpdateMilestoneProps {
  milestone: Milestone;
  isEditing: boolean;
  previousDescription?: string;
  cancelEditing: (value: boolean) => void;
}

export const UpdateMilestone: FC<UpdateMilestoneProps> = ({
  milestone,
  isEditing,
  previousDescription,
  cancelEditing,
}) => {
  const selectedProject = useProjectStore((state) => state.project);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const [description, setDescription] = useState(previousDescription || "");
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  const signer = useSigner();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const completeMilestone = async (milestone: Milestone, text?: string) => {
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchNetworkAsync?.(milestone.chainID);
      }
      await milestone.complete(signer as any, text).then(async () => {
        toast.success(MESSAGES.MILESTONES.COMPLETE.SUCCESS);
        await refreshProject();
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.ERROR);
    }
  };

  const updateMilestoneCompletion = async (
    milestone: Milestone,
    text?: string
  ) => {
    try {
      if (chain && chain.id !== milestone.chainID) {
        await switchNetworkAsync?.(milestone.chainID);
      }
      await milestone.complete(signer as any, text).then(async () => {
        toast.success(MESSAGES.MILESTONES.UPDATE_COMPLETION.SUCCESS);
        await refreshProject();
      });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.UPDATE_COMPLETION.ERROR);
    }
  };

  const handleCompleteMilestone = async () => {
    setIsSubmitLoading(true);
    if (isEditing) {
      await updateMilestoneCompletion(milestone, description)
        .then(() => {
          setIsUpdating(false);
          cancelEditing(false);
        })
        .finally(() => {
          setIsSubmitLoading(false);
        });
    } else {
      await completeMilestone(milestone, description)
        .then(() => {
          cancelEditing(false);
          setIsUpdating(false);
        })
        .finally(() => {
          setIsSubmitLoading(false);
        });
    }
  };

  return isUpdating || isEditing ? (
    <div className="flex w-full flex-col">
      <div className="flex w-full flex-col items-start" data-color-mode="light">
        <div className="w-full max-w-3xl">
          <MarkdownEditor
            value={description}
            onChange={(newValue: string) => setDescription(newValue || "")}
          />
        </div>
        <div className="mt-4 flex w-full flex-row justify-end gap-4">
          <Button
            type="button"
            className="flex h-min w-max flex-row  gap-2 rounded border border-black bg-transparent px-4 py-2.5 text-base dark:text-zinc-100 dark:border-zinc-100 font-semibold text-black hover:bg-transparent"
            disabled={isSubmitLoading}
            onClick={() => {
              setIsSubmitLoading(false);
              setIsUpdating(false);
              cancelEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitLoading}
            disabled={isSubmitLoading}
            className="flex h-min w-max flex-row gap-2 items-center rounded bg-brand-blue px-4 py-2.5 hover:bg-brand-blue"
            onClick={() => {
              handleCompleteMilestone();
            }}
          >
            <p className="text-base font-semibold text-white ">
              {isEditing ? "Edit update" : "Mark as complete"}
            </p>
            {isEditing ? (
              <PencilSquareIcon className="h-4 w-4" />
            ) : (
              <img
                src="/icons/rounded-check.svg"
                className="h-4 w-4"
                alt="Complete"
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <NotUpdatingCase
      isAuthorized={isAuthorized}
      milestone={milestone}
      setIsUpdating={setIsUpdating}
    />
  );
};
