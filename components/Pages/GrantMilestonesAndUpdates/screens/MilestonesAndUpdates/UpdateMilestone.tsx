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
import { getWalletClient } from "@wagmi/core";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { ShareDialog } from "./ShareDialog";
import { useStepper } from "@/store/modals/txStepper";
import { config } from "@/utilities/wagmi/config";
import {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getGapClient, useGap } from "@/hooks";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

import { errorManager } from "@/components/Utilities/errorManager";
import { sanitizeObject } from "@/utilities/sanitize";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { cn } from "@/utilities/tailwind";

const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const inputStyle =
  "bg-white border border-gray-300 rounded-md p-2 dark:bg-zinc-900";
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
  previousData?: IMilestoneCompleted["data"];
  cancelEditing: (value: boolean) => void;
}

const schema = z.object({
  description: z.string().optional(),
  proofOfWork: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
});

type SchemaType = z.infer<typeof schema>;

export const UpdateMilestone: FC<UpdateMilestoneProps> = ({
  milestone,
  isEditing,
  previousData,
  cancelEditing,
}) => {
  const selectedProject = useProjectStore((state) => state.project);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectOwner || isContractOwner || isCommunityAdmin;
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      description: previousData?.reason,
      proofOfWork: previousData?.proofOfWork,
    },
  });

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
    data: SchemaType
  ) => {
    let gapClient = gap;
    setIsSubmitLoading(true);
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
        ?.complete(
          walletSigner,
          sanitizeObject({
            reason: data.description,
            proofOfWork: data.proofOfWork,
          }),
          changeStepperStep
        )
        .then(async (res) => {
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }
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
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.ERROR);
      errorManager(
        `Error completing milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error,
        {
          milestoneUID: milestone.uid,
          grantUID: milestone.refUID,
          projectUID: project?.uid,
          address: address,
          data: milestone,
        }
      );
    } finally {
      setIsSubmitLoading(false);
      setIsStepper(false);
    }
  };

  const updateMilestoneCompletion = async (
    milestone: IMilestoneResponse,
    data: SchemaType
  ) => {
    setIsSubmitLoading(true);
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
        ?.complete(
          walletSigner,
          sanitizeObject({
            reason: data.description,
            proofOfWork: data.proofOfWork,
          }),
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneInstance.chainID),
              "POST",
              {}
            );
          }
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
    } catch (error: any) {
      console.log(error);
      toast.error(MESSAGES.MILESTONES.UPDATE_COMPLETION.ERROR);
      errorManager(
        `Error updating completion of milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error
      );
    } finally {
      setIsStepper(false);
      setIsSubmitLoading(false);
    }
  };

  const onSubmit = async (data: SchemaType) => {
    const sanitizedData = sanitizeObject(data);
    if (isEditing) {
      await updateMilestoneCompletion(milestone, sanitizedData);
    } else {
      await completeMilestone(milestone, sanitizedData);
    }
  };

  return isUpdating || isEditing ? (
    <form
      className="flex w-full flex-col  max-w-3xl"
      onSubmit={handleSubmit(onSubmit)}
    >
      {milestone.refUID && isDialogOpen ? (
        <ShareDialog
          milestoneName={milestone.data.title}
          closeDialog={closeDialog}
          isOpen={isDialogOpen}
          milestoneRefUID={milestone.refUID as string}
        />
      ) : null}
      <div className="flex w-full flex-col items-start gap-2">
        <div
          className="flex w-full flex-col items-start gap-2"
          data-color-mode="light"
        >
          <label className={labelStyle}>Description (optional)</label>
          <div className="w-full" data-color-mode="light">
            <MarkdownEditor
              value={watch("description") || ""}
              onChange={(newValue: string) => {
                setValue("description", newValue || "", {
                  shouldValidate: true,
                });
              }}
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="proofOfWork-input" className={labelStyle}>
            Output of your work *
          </label>
          <p className="text-sm text-gray-500">
            Provide a link that demonstrates your work. This could be a link to
            a tweet announcement, a dashboard, a Google Doc, a blog post, a
            video, or any other resource that highlights the progress or result
            of your work
          </p>
          <div className="flex flex-row gap-2 items-center py-2">
            <input
              type="checkbox"
              className="rounded-sm w-5 h-5 bg-white fill-black"
              checked={noProofCheckbox}
              onChange={() => {
                setNoProofCheckbox((oldValue) => !oldValue);
                setValue("proofOfWork", "", {
                  shouldValidate: true,
                });
              }}
            />
            <p className="text-base text-zinc-900 dark:text-zinc-100">{`I don't have any output to show for this milestone`}</p>
          </div>
          <input
            id="proofOfWork-input"
            placeholder="Add links to charts, videos, dashboards etc. that evaluators can verify your work"
            type="text"
            className={cn(inputStyle, "disabled:opacity-50")}
            disabled={noProofCheckbox}
            {...register("proofOfWork")}
          />
          <p className="text-red-500">{errors.proofOfWork?.message}</p>
        </div>
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
          disabled={
            isSubmitLoading ||
            !isValid ||
            (!noProofCheckbox && !watch("proofOfWork"))
          }
          className="flex h-min w-max flex-row gap-2 items-center rounded bg-brand-blue px-4 py-2.5 hover:bg-brand-blue"
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
    </form>
  ) : (
    <NotUpdatingCase
      isAuthorized={isAuthorized}
      milestone={milestone}
      setIsUpdating={setIsUpdating}
    />
  );
};
