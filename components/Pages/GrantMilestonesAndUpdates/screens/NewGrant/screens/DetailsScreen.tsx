import React, { useState } from "react";
import { StepBlock } from "../StepBlock";
import { useGrantFormStore } from "../store";
import { useParams, usePathname, useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useOwnerStore, useProjectStore } from "@/store";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { formatDate } from "@/utilities/formatDate";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isAddress } from "viem";
import { MESSAGES } from "@/utilities/messages";
import { useAuthStore } from "@/store/auth";
import { useAccount, useSwitchChain } from "wagmi";
import { useStepper } from "@/store/modals/txStepper";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks";
import { sanitizeObject } from "@/utilities/sanitize";
import { getGapClient } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { NextButton } from "./buttons/NextButton";
import { CancelButton } from "./buttons/CancelButton";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getProjectById } from "@/utilities/sdk";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:text-zinc-100 dark:border-gray-600 disabled:bg-gray-100 disabled:text-gray-400";

const defaultFundUsage = `| Budget Item    | % of Allocated funding |
| -------- | ------- |
| Item 1  | X%   |
| Item 2 | Y%     |
| Item 3 | Z%     |`;

// Define base schema for both flows
const baseSchema = z.object({
  startDate: z
    .date({
      required_error: MESSAGES.GRANT.FORM.DATE,
    })
    .optional(),
  description: z.string().optional(),
});

// Define additional fields for grant flow
const grantSchema = baseSchema.extend({
  description: z.string().min(1, { message: "Description is required" }),
  amount: z.string().optional(),
  linkToProposal: z
    .string()
    .url({
      message: MESSAGES.GRANT.FORM.LINK_TO_PROPOSAL,
    })
    .or(z.literal("")),
  recipient: z
    .string()
    .optional()
    .refine(
      (input) => !input || input?.length === 0 || isAddress(input),
      MESSAGES.GRANT.FORM.RECIPIENT
    ),
});

// Define types based on schemas
type BaseFormType = z.infer<typeof baseSchema>;
type GrantFormType = z.infer<typeof grantSchema>;

export const DetailsScreen: React.FC = () => {
  const {
    setCurrentStep,
    flowType,
    formData,
    updateFormData,
    resetFormData,
    setFlowType,
    clearMilestonesForms,
    setFormPriorities,
    communityNetworkId,
  } = useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();
  const { address, isConnected, connector, chain } = useAccount();
  const { isAuth } = useAuthStore();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { isCommunityAdmin } = useCommunityAdminStore();
  const { isOwner } = useOwnerStore();
  const [isLoading, setIsLoading] = useState(false);
  const isAuthorized = isOwner || isCommunityAdmin;
  const params = useParams();
  const grant = params.grantUid as string;
  const pathname = usePathname();
  const isEditing = pathname.includes("/edit");

  const { switchChainAsync } = useSwitchChain();
  // Initialize the appropriate form based on flow type
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
    control,
  } = useForm<GrantFormType>({
    resolver: zodResolver(flowType === "grant" ? grantSchema : baseSchema),
    defaultValues: {
      startDate: formData.startDate,
      description: formData.description || "",
      amount: formData.amount || "",
      linkToProposal: formData.linkToProposal || "",
      recipient: formData.recipient || selectedProject?.recipient || "",
    },
    mode: "onChange",
  });

  // Watch the description field
  const description = watch("description");

  const handleBack = () => {
    setCurrentStep(2);
  };

  const handleCancel = () => {
    if (!selectedProject) return;
    router.push(
      PAGES.PROJECT.GRANTS(
        selectedProject.details?.data?.slug || selectedProject?.uid
      )
    );
  };

  const updateGrant = async (
    oldGrant: IGrantResponse,
    data: Partial<typeof formData>
  ) => {
    if (!address || !oldGrant.refUID || !selectedProject) return;
    let gapClient = gap;
    try {
      setIsLoading(true);
      if (chain?.id !== oldGrant.chainID) {
        await switchChainAsync?.({ chainId: oldGrant.chainID });
        gapClient = getGapClient(communityNetworkId);
      }
      if (!gapClient) return;
      const projectInstance = await getProjectById(oldGrant.refUID);
      const oldGrantInstance = projectInstance?.grants?.find(
        (item) => item?.uid?.toLowerCase() === oldGrant?.uid?.toLowerCase()
      );
      if (!oldGrantInstance) return;

      oldGrantInstance.setValues({
        communityUID: data.community,
      });
      const grantData = sanitizeObject({
        ...oldGrantInstance.details?.data,
        ...data,
        proposalURL: data.linkToProposal,
        payoutAddress: address,
        startDate: data.startDate
          ? new Date(data.startDate).getTime() / 1000
          : oldGrantInstance.details?.startDate,
        selectedTrackIds:
          data.selectedTrackIds || formData.selectedTrackIds || [],
      });
      oldGrantInstance.details?.setValues(grantData);

      const { walletClient, error } = await safeGetWalletClient(
        oldGrant.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const oldProjectData = await gapIndexerApi
        .projectBySlug(oldGrant.refUID)
        .then((res) => res.data);
      const oldGrantData = oldProjectData?.grants?.find(
        (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
      );
      await oldGrantInstance.details
        ?.attest(walletSigner as any, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, oldGrant.chainID),
              "POST",
              {}
            );
          }
          while (retries > 0) {
            const fetchedProject = await gapIndexerApi
              .projectBySlug(oldGrant.refUID)
              .then((res) => res.data)
              .catch(() => null);
            const fetchedGrant = fetchedProject?.grants.find(
              (item) => item.uid.toLowerCase() === oldGrant.uid.toLowerCase()
            );

            if (
              new Date(fetchedGrant?.details?.updatedAt) >
              new Date(oldGrantData?.details?.updatedAt)
            ) {
              clearMilestonesForms();
              // Reset form data and go back to step 1 for a new grant
              resetFormData();
              setFormPriorities([]);
              setCurrentStep(1);
              setFlowType("grant"); // Reset to default flow type
              retries = 0;
              toast.success(MESSAGES.GRANT.UPDATE.SUCCESS);
              changeStepperStep("indexed");
              await refreshProject().then(() => {
                router.push(
                  PAGES.PROJECT.GRANT(
                    selectedProject.details?.data?.slug || selectedProject.uid,
                    oldGrant.uid
                  )
                );
                router.refresh();
              });
            }
            retries -= 1;
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        });
    } catch (error: any) {
      errorManager(
        MESSAGES.GRANT.UPDATE.ERROR,
        error,
        {
          grantUID: oldGrant.uid,
          projectUID: selectedProject.uid,
        },
        { error: MESSAGES.GRANT.UPDATE.ERROR }
      );
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  const handleNext = () => {
    if (!isValid) return;

    // Create a base update object
    const updateObj: Partial<typeof formData> = {
      description: watch("description"),
      startDate: watch("startDate"),
    };

    // Add grant-specific fields if in grant flow
    if (flowType === "grant") {
      updateObj.amount = watch("amount");
      updateObj.linkToProposal = watch("linkToProposal");
      updateObj.recipient = watch("recipient");
      // Always include the latest selectedTrackIds from the form data
      updateObj.selectedTrackIds = formData.selectedTrackIds;
    }

    // Update form data
    updateFormData(updateObj);
    if (isEditing) {
      updateGrant(
        selectedProject?.grants?.find(
          (g) => g.uid.toLowerCase() === grant.toLowerCase()
        ) as IGrantResponse,
        { ...updateObj, community: formData.community || "" }
      );
    } else {
      setCurrentStep(4);
    }
  };

  return (
    <StepBlock currentStep={3} totalSteps={4}>
      <div className="flex flex-col w-full mx-auto">
        <h3 className="text-xl font-semibold mb-6 text-center">
          Add details to your {flowType === "grant" ? "grant" : "application"}
        </h3>

        <form
          className="w-full mb-8 space-y-6"
          onSubmit={handleSubmit(handleNext)}
        >
          {/* Start Date and Recipient side-by-side */}
          <div className="flex flex-row gap-6 w-full max-md:flex-col">
            {/* Start Date - Required for both flows */}
            <div className="flex flex-col flex-1">
              <label className={labelStyle}>Start Date *</label>
              <div className="mt-2">
                <DatePicker
                  selected={watch("startDate")}
                  onSelect={(date) => {
                    if (
                      formatDate(date) === formatDate(watch("startDate") || "")
                    ) {
                      setValue("startDate", undefined, {
                        shouldValidate: true,
                      });
                    } else {
                      setValue("startDate", date, { shouldValidate: true });
                    }
                    trigger();
                  }}
                  placeholder="Pick a date"
                  buttonClassName="w-full text-base bg-gray-100 dark:bg-zinc-800"
                  clearButtonFn={() => {
                    setValue("startDate", undefined, { shouldValidate: true });
                    trigger();
                  }}
                />
              </div>
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            {/* Recipient field - Only for grant flow */}
            {flowType === "grant" && (
              <div className="flex flex-col flex-1">
                <label htmlFor="grant-recipient" className={labelStyle}>
                  Recipient Address {isAuthorized ? "(optional)" : ""}
                </label>
                <input
                  id="grant-recipient"
                  className={inputStyle}
                  placeholder="0x..."
                  disabled={!isAuthorized}
                  {...register("recipient")}
                />
                {!isAuthorized && (
                  <p className="text-gray-500 text-xs mt-1">
                    Only community admins can change the recipient address
                  </p>
                )}
                {errors.recipient && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.recipient?.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fields only for grant flow */}
          {flowType === "grant" && (
            <>
              <div className="flex flex-row gap-6 w-full max-md:flex-col">
                <div className="flex flex-col flex-1">
                  <label htmlFor="grant-amount" className={labelStyle}>
                    Amount (optional)
                  </label>
                  <input
                    id="grant-amount"
                    className={inputStyle}
                    placeholder="25K OP"
                    {...register("amount")}
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.amount?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col flex-1">
                  <label htmlFor="grant-linkToProposal" className={labelStyle}>
                    Link to Proposal (optional)
                  </label>
                  <input
                    id="grant-linkToProposal"
                    className={inputStyle}
                    {...register("linkToProposal")}
                  />
                  {errors.linkToProposal && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.linkToProposal?.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Description - Required for grant flow, optional for program flow */}
          <div className="flex w-full flex-col">
            <label htmlFor="grant-description" className={labelStyle}>
              Description {flowType === "grant" ? "*" : "(optional)"}
            </label>
            <div className="mt-2 w-full bg-transparent dark:border-gray-600">
              <MarkdownEditor
                className="bg-transparent dark:border-gray-600"
                value={description || ""}
                onChange={(newValue: string) => {
                  setValue("description", newValue || "", {
                    shouldValidate: true,
                  });
                  trigger("description");
                }}
                placeholderText={
                  flowType === "grant"
                    ? `Add a brief description about this grant`
                    : `Add optional details`
                }
              />
            </div>
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
        </form>

        <div className="flex justify-between w-full">
          <CancelButton onClick={handleCancel} text="Cancel" />

          <div className="flex gap-4">
            <CancelButton onClick={handleBack} text="Back" />
            <NextButton
              onClick={handleSubmit(handleNext)}
              disabled={!isValid}
              text={
                flowType === "grant" ? (isEditing ? "Update" : "Next") : "Next"
              }
            />
          </div>
        </div>
      </div>
    </StepBlock>
  );
};
