/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/community";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { ShareDialog } from "./ShareDialog";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import { IMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getGapClient, useGap } from "@/hooks";

import { errorManager } from "@/components/Utilities/errorManager";

interface NotUpdatingCaseProps {
  milestone: IMilestoneResponse;
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
  milestone: IMilestoneResponse;
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
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [description, setDescription] = useState(previousDescription || "");
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = async () => {
    setIsDialogOpen(false);
    await refreshProject();
    cancelEditing(false);
    setIsUpdating(false);
  };
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const project = useProjectStore((state) => state.project);

  const completeMilestone = async (
    milestone: IMilestoneResponse,
    text?: string
  ) => {
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
      }
      const walletClient = await getWalletClient(config, {
        chainId: milestone.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);

      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const milestoneInstance = grantInstance.milestones.find(
        (u) => u.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      await milestoneInstance
        ?.complete(walletSigner, text, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const foundGrant = fetchedProject?.grants.find(
                  (g) => g.uid === milestone.refUID
                );

                const fetchedMilestone = foundGrant?.milestones.find(
                  (u: any) => u.uid === milestone.uid
                );

                const isCompleted = fetchedMilestone?.completed;

                if (isCompleted) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.COMPLETE.SUCCESS);
                  closeDialog();
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.ERROR);
      errorManager(
        `Error completing milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error
      );
    } finally {
      setIsStepper(false);
    }
  };

  const updateMilestoneCompletion = async (
    milestone: IMilestoneResponse,
    text?: string
  ) => {
    let gapClient = gap;
    try {
      if (chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: milestone.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const fetchedProject = await gapClient.fetch.projectById(project?.uid);
      if (!fetchedProject) return;
      const grantInstance = fetchedProject.grants.find(
        (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
      );
      if (!grantInstance) return;
      const milestoneInstance = grantInstance.milestones.find(
        (u) => u.uid.toLowerCase() === milestone.uid.toLowerCase()
      );
      await milestoneInstance
        ?.complete(walletSigner, text, changeStepperStep)
        .then(async () => {
          let retries = 1000;
          changeStepperStep("indexing");
          while (retries > 0) {
            await refreshProject()
              .then(async (fetchedProject) => {
                const foundGrant = fetchedProject?.grants.find(
                  (g) => g.uid === milestone.refUID
                );

                const fetchedMilestone = foundGrant?.milestones.find(
                  (u: any) => u.uid === milestone.uid
                );

                if (
                  new Date(milestone?.completed?.updatedAt) <
                  new Date(fetchedMilestone?.completed?.updatedAt)
                ) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.UPDATE_COMPLETION.SUCCESS);
                  closeDialog();
                }
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              })
              .catch(async () => {
                retries -= 1;
                // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 1500));
              });
          }
        });
    } catch (error) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.UPDATE_COMPLETION.ERROR);
      errorManager(
        `Error updating completion of milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error
      );
    } finally {
      setIsStepper(false);
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
      await completeMilestone(milestone, description).finally(() => {
        setIsSubmitLoading(false);
      });
    }
  };

  return isUpdating || isEditing ? (
    <div className="flex w-full flex-col">
      {milestone.refUID && isDialogOpen ? (
        <ShareDialog
          milestoneName={milestone.data.title}
          closeDialog={closeDialog}
          isOpen={isDialogOpen}
          milestoneRefUID={milestone.refUID as string}
        />
      ) : null}
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
