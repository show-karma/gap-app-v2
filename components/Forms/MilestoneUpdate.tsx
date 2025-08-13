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
import { type FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { errorManager } from "../Utilities/errorManager";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { useWallet } from "@/hooks/useWallet";
import { OutputsSection } from "@/components/Forms/Outputs/OutputsSection";
import { sendMilestoneImpactAnswers } from "@/utilities/impact/milestoneImpactAnswers";
import { useMilestoneImpactAnswers } from "@/hooks/useMilestoneImpactAnswers";

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
  completionPercentage: z.string().refine(
    (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    {
      message: "Please enter a number between 0 and 100",
    }
  ),
  outputs: z.array(
    z.object({
      outputId: z.string().min(1, "Output is required"),
      value: z.union([z.number().min(0), z.string()]),
      proof: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  ),
  deliverables: z.array(
    z.object({
      name: z.string().min(1, "Name is required"),
      proof: z.string().min(1, "Proof is required"),
      description: z.string().optional(),
    })
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
  const router = useRouter();

  // Fetch existing milestone impact data to populate the form
  const { data: milestoneImpactData } = useMilestoneImpactAnswers({
    milestoneUID: milestone.uid,
  });

  // Transform milestone impact data to form format
  const transformMilestoneImpactToOutputs = (impactData: any[]) => {
    if (!impactData || impactData.length === 0) return [];
    
    return impactData.map((metric: any) => ({
      outputId: metric.id || '',
      value: metric.datapoints && metric.datapoints.length > 0 ? metric.datapoints[0].value : '',
      proof: metric.datapoints && metric.datapoints.length > 0 ? metric.datapoints[0].proof || '' : '',
      startDate: metric.datapoints && metric.datapoints.length > 0 ? metric.datapoints[0].startDate || '' : '',
      endDate: metric.datapoints && metric.datapoints.length > 0 ? metric.datapoints[0].endDate || '' : '',
    }));
  };

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<SchemaType>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      description: previousData?.reason,
      outputs: [],
      deliverables: (previousData as any)?.deliverables || [],
    },
  });

  // Update form values when milestone impact data is loaded
  useEffect(() => {
    if (milestoneImpactData && milestoneImpactData.length > 0) {
      const transformedOutputs = transformMilestoneImpactToOutputs(milestoneImpactData);
      setValue('outputs', transformedOutputs, { shouldValidate: true });
    }
  }, [milestoneImpactData, setValue]);

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

  // Get grant and community information for OutputsSection
  const grantInstance = project?.grants?.find(g => g.uid === milestone.refUID);
  const selectedCommunities = grantInstance?.community ? [{
    uid: grantInstance.community.uid,
    name: grantInstance.community.details?.data?.name || '',
    details: grantInstance.community.details
  }] : [];
  const selectedPrograms = grantInstance?.details?.data?.programId ? [{
    programId: grantInstance.details.data.programId,
    title: grantInstance.details.data.title || '',
    chainID: grantInstance.chainID
  }] : [];

  // Helper function to send outputs and deliverables data
  const sendOutputsAndDeliverables = async (
    milestoneUID: string,
    data: SchemaType
  ) => {
    try {
      // Send outputs (metrics) data if any
      if (data.outputs && data.outputs.length > 0) {
        for (const output of data.outputs) {
          if (output.outputId && (output.value !== undefined && output.value !== "")) {
            // Default to today's date if not specified (matching project behavior)
            const today = new Date().toISOString().split('T')[0];
            
            const datapoints = [{
              value: output.value,
              proof: output.proof || "",
              startDate: output.startDate || today,
              endDate: output.endDate || today,
            }];
            
            await sendMilestoneImpactAnswers(
              milestoneUID,
              output.outputId,
              datapoints,
              () => {
                console.log(`Successfully sent output data for indicator ${output.outputId}`);
              },
              (error) => {
                console.error(`Error sending output data for indicator ${output.outputId}:`, error);
              }
            );
          }
        }
      }

      // Send deliverables data if any
      if (data.deliverables && data.deliverables.length > 0) {
        // For now, deliverables are just stored with the milestone completion
        // In the future, they could be sent as separate entities to the backend
        console.log("Deliverables included with milestone completion:", data.deliverables);
      }
    } catch (error) {
      console.error("Error sending outputs and deliverables:", error);
      // Don't throw - we don't want to fail the milestone completion if outputs fail
    }
  };

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
            proofOfWork: "",
            completionPercentage: data.completionPercentage,
            type: "completed",
            deliverables: data.deliverables || [],
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
                  
                  // Send outputs and deliverables data
                  await sendOutputsAndDeliverables(milestone.uid, data);
                  
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
            proofOfWork: "",
            completionPercentage: data.completionPercentage,
            type: "completed",
            deliverables: data.deliverables || [],
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
                  
                  // Send outputs and deliverables data
                  await sendOutputsAndDeliverables(milestone.uid, data);
                  
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

        {/* Outputs Section */}
        <OutputsSection
          register={register}
          control={control}
          setValue={setValue}
          watch={watch}
          errors={errors}
          projectUID={project?.uid || ''}
          selectedCommunities={selectedCommunities}
          selectedPrograms={selectedPrograms}
          onCreateNewIndicator={() => {}}
          onIndicatorCreated={() => {}}
          labelStyle={labelStyle}
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
          disabled={
            isSubmitLoading ||
            !isValid
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
