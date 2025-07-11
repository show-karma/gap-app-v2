"use client";

import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { sanitizeObject } from "@/utilities/sanitize";
import { cn } from "@/utilities/tailwind";
import { config } from "@/utilities/wagmi/config";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IMilestoneCompleted,
  IMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { useWallet } from "@/hooks/useWallet";

interface MilestoneUpdateFormProps {
  milestone: IMilestoneResponse;
  isEditing: boolean;
  previousData?: IMilestoneCompleted["data"];
  cancelEditing: (value: boolean) => void;
  afterSubmit?: () => void;
}

const labelStyle =
  "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const inputStyle =
  "bg-white border border-gray-300 rounded-md p-2 dark:bg-zinc-900";

const schema = z.object({
  description: z.string().optional(),
  proofOfWork: z
    .string()
    .refine((value) => urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  completionPercentage: z.string().refine(
    (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    {
      message: "Please enter a number between 0 and 100",
    }
  ),
});
type SchemaType = z.infer<typeof schema>;

export const MilestoneUpdateForm: FC<MilestoneUpdateFormProps> = ({
  milestone,
  isEditing,
  previousData,
  cancelEditing,
  afterSubmit,
}) => {
  const selectedProject = useProjectStore((state) => state.project);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useWallet();
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isProjectAdmin || isContractOwner || isCommunityAdmin;
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const { openShareDialog, closeShareDialog } = useShareDialogStore();
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);
  const router = useRouter();

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
    openShareDialog({
      modalShareText: `You did it! 🎉 Another milestone down, more impact ahead. Your onchain trail is growing — keep stacking progress.`,
      modalShareSecondText: ` `,
      shareText: SHARE_TEXTS.MILESTONE_COMPLETED(
        grant?.details?.data?.title as string,
        (project?.details?.data?.slug || project?.uid) as string,
        grant?.uid as string
      ),
    });
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

      const { walletClient, error } = await safeGetWalletClient(
        milestone.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
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
            completionPercentage: data.completionPercentage,
            type: "completed",
          }),
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(
                txHash,
                milestoneInstance?.chainID as number
              ),
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

                const isCompleted = fetchedMilestone?.completed;

                if (isCompleted) {
                  retries = 0;
                  changeStepperStep("indexed");
                  toast.success(MESSAGES.MILESTONES.COMPLETE.SUCCESS);
                  afterSubmit?.();
                  openDialog();
                  cancelEditing(false);
                  setIsUpdating(false);
                  router.push(
                    PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                      fetchedProject?.uid as string,
                      grantInstance.uid,
                      "milestones-and-updates"
                    )
                  );
                  router.refresh();
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
      errorManager(
        `Error completing milestone ${milestone.uid} from grant ${milestone.refUID}`,
        error,
        {
          grantUID: milestone.refUID,
          projectUID: project?.uid,
          address: address,
          data: milestone,
        },
        {
          error: MESSAGES.MILESTONES.COMPLETE.ERROR,
        }
      );
    } finally {
      setIsStepper(false);
      setIsSubmitLoading(false);
    }
  };

  const updateMilestoneCompletion = async (
    milestone: IMilestoneResponse,
    data: SchemaType
  ) => {
    let gapClient = gap;
    setIsSubmitLoading(true);
    try {
      if (chain?.id !== milestone.chainID) {
        await switchChainAsync?.({ chainId: milestone.chainID });
        gapClient = getGapClient(milestone.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(
        milestone.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
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
            completionPercentage: data.completionPercentage,
            type: "completed",
          }),
          changeStepperStep
        )
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(
                txHash,
                milestoneInstance?.chainID as number
              ),
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
                  closeShareDialog();
                  PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                    fetchedProject?.uid as string,
                    grantInstance.uid,
                    "milestones-and-updates"
                  );
                  cancelEditing(false);
                  setIsUpdating(false);
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
      errorManager(
        `Error updating milestone completion ${milestone.uid} from grant ${milestone.refUID}`,
        error,
        {
          grantUID: milestone.refUID,
          projectUID: project?.uid,
          address: address,
          data: milestone,
        },
        {
          error: MESSAGES.MILESTONES.UPDATE_COMPLETION.ERROR,
        }
      );
    } finally {
      setIsStepper(false);
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

  const grant = project?.grants.find(
    (item) => item.uid.toLowerCase() === milestone.refUID?.toLowerCase()
  );

  return (
    <form className="flex w-full flex-col" onSubmit={handleSubmit(onSubmit)}>
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
              id="noProofCheckbox"
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
            <label
              htmlFor="noProofCheckbox"
              className="text-base text-zinc-900 dark:text-zinc-100"
            >
              {`I don't have any output to show for this milestone`}
            </label>
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

        <div className="flex w-full flex-row items-center gap-4 py-2">
          <label htmlFor="completion-percentage" className={labelStyle}>
            What % of your grant is complete? *
          </label>
          <div className="flex flex-col">
            <input
              id="completion-percentage"
              type="number"
              min="0"
              max="100"
              placeholder="0-100"
              className={cn(inputStyle, "w-24")}
              {...register("completionPercentage")}
            />
            <p className="text-red-500 text-xs mt-1">
              {errors.completionPercentage?.message}
            </p>
          </div>
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
  );
};
