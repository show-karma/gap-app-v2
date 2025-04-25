"use client";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Button } from "@/components/Utilities/Button";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UnifiedMilestone } from "@/utilities/gapIndexerApi/getAllMilestones";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { useAccount, useSwitchChain } from "wagmi";
import { useGap, getGapClient } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useStepper } from "@/store/modals/txStepper";
import { useProjectStore } from "@/store";
import toast from "react-hot-toast";
import { MESSAGES } from "@/utilities/messages";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { Hex } from "viem";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { cn } from "@/utilities/tailwind";
import { Milestone } from "@show-karma/karma-gap-sdk/core/class/entities/Milestone";
import { MilestoneCompleted } from "@show-karma/karma-gap-sdk/core/class/types/attestations";

// Create form schema with zod
const formSchema = z.object({
  description: z
    .string()
    .min(3, { message: "Description must be at least 3 characters" })
    .or(z.literal(""))
    .optional(),
  proofOfWork: z
    .string()
    .refine((value) => !value || urlRegex.test(value), {
      message: "Please enter a valid URL",
    })
    .optional()
    .or(z.literal("")),
  completionPercentage: z
    .string()
    .refine(
      (value) => {
        if (!value) return true; // Allow empty value
        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      {
        message: "Please enter a number between 0 and 100",
      }
    )
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

// Extended UnifiedMilestone type to include the properties we need
interface ExtendedUnifiedMilestone extends UnifiedMilestone {
  chainID: number;
  refUID: string;
  id: string;
  mergedGrants?: Array<{
    grantId: string;
    grantTitle?: string;
    communityName?: string;
    communityImage?: string;
  }>;
}

interface GrantMilestoneCompletionFormProps {
  milestone: ExtendedUnifiedMilestone;
  handleCompleting: (isCompleting: boolean) => void;
}

export const GrantMilestoneCompletionForm = ({
  milestone,
  handleCompleting,
}: GrantMilestoneCompletionFormProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);
  const { chain, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      proofOfWork: "",
      completionPercentage: "",
    },
  });

  // Function to complete a single grant milestone
  const completeSingleMilestone = async (
    milestone: ExtendedUnifiedMilestone,
    data: FormData
  ) => {
    let gapClient = gap;

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
        (u) => u.uid.toLowerCase() === milestone.id.toLowerCase()
      );

      if (!milestoneInstance) return;

      const completionData = sanitizeObject({
        reason: data.description,
        proofOfWork: noProofCheckbox ? "" : data.proofOfWork,
        completionPercentage: data.completionPercentage,
        type: "completed",
      });

      const result = await milestoneInstance.complete(
        walletSigner,
        completionData,
        changeStepperStep
      );

      // Notify indexer
      const txHash = result?.tx[0]?.hash;
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

      return { milestoneInstance, grantInstance, result };
    } catch (error) {
      console.error("Error completing milestone:", error);
      throw error;
    }
  };

  // Function to complete multiple grant milestones
  const completeMultipleGrantMilestones = async (
    milestone: ExtendedUnifiedMilestone,
    data: FormData
  ) => {
    if (!milestone.mergedGrants || milestone.mergedGrants.length <= 1) {
      // If no merged grants or just one, use the single milestone completion
      return completeSingleMilestone(milestone, data);
    }

    let gapClient = gap;

    try {
      // Group milestones by chain ID to handle cross-chain milestones
      const milestonesByChain: Record<
        number,
        {
          grantId: string;
          milestoneId: string;
        }[]
      > = {};

      // Add the primary milestone
      if (!milestonesByChain[milestone.chainID]) {
        milestonesByChain[milestone.chainID] = [];
      }
      milestonesByChain[milestone.chainID].push({
        grantId: milestone.refUID,
        milestoneId: milestone.id,
      });

      // Add all merged grant milestones
      milestone.mergedGrants.forEach((grant) => {
        const grantMilestone = milestone.source.grantMilestone;
        if (!grantMilestone) return;

        const chainId = grantMilestone.grant.chainID;
        if (!milestonesByChain[chainId]) {
          milestonesByChain[chainId] = [];
        }

        milestonesByChain[chainId].push({
          grantId: grant.grantId,
          milestoneId: milestone.id, // Same milestone ID for duplicated milestones
        });
      });

      // Process each chain's milestones separately
      const results = [];
      for (const [chainIdStr, chainMilestones] of Object.entries(
        milestonesByChain
      )) {
        const chainId = Number(chainIdStr);

        // Switch chain if needed
        if (chain?.id !== chainId) {
          await switchChainAsync?.({ chainId });
          gapClient = getGapClient(chainId);
        }

        if (!gapClient) throw new Error("Failed to get GAP client");

        const { walletClient, error } = await safeGetWalletClient(chainId);
        if (error || !walletClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
        }

        const walletSigner = await walletClientToSigner(walletClient);
        const fetchedProject = await gapClient.fetch.projectById(project?.uid);
        if (!fetchedProject) continue;

        // Process the milestones in this chain
        if (chainMilestones.length === 1) {
          // Single milestone on this chain - use standard completion
          const { grantId, milestoneId } = chainMilestones[0];
          const grantInstance = fetchedProject.grants.find(
            (g) => g.uid.toLowerCase() === grantId.toLowerCase()
          );

          if (!grantInstance) continue;

          const milestoneInstance = grantInstance.milestones.find(
            (u) => u.uid.toLowerCase() === milestoneId.toLowerCase()
          );

          if (!milestoneInstance) continue;

          const completionData = sanitizeObject({
            reason: data.description,
            proofOfWork: noProofCheckbox ? "" : data.proofOfWork,
            completionPercentage: data.completionPercentage,
            type: "completed",
          });

          const result = await milestoneInstance.complete(
            walletSigner,
            completionData,
            changeStepperStep
          );

          // Notify indexer
          const txHash = result?.tx[0]?.hash;
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

          results.push({ milestoneInstance, grantInstance, result });
        } else {
          // Multiple milestones on the same chain - use multi-attestation
          changeStepperStep("preparing");

          // Create payloads for all milestones
          const allPayloads: any[] = [];
          const milestoneInstances = [];
          const grantInstances = [];

          for (const { grantId, milestoneId } of chainMilestones) {
            const grantInstance = fetchedProject.grants.find(
              (g) => g.uid.toLowerCase() === grantId.toLowerCase()
            );

            if (!grantInstance) continue;

            const milestoneInstance = grantInstance.milestones.find(
              (u) => u.uid.toLowerCase() === milestoneId.toLowerCase()
            );

            if (!milestoneInstance) continue;

            const completionData = sanitizeObject({
              reason: data.description,
              proofOfWork: noProofCheckbox ? "" : data.proofOfWork,
              completionPercentage: data.completionPercentage,
              type: "completed",
            });

            // Store the instances for reference
            milestoneInstances.push(milestoneInstance);
            grantInstances.push(grantInstance);

            // Prepare the milestone completion schema
            const schema =
              milestoneInstance.schema.gap.findSchema("MilestoneCompleted");

            if (milestoneInstance.schema.isJsonSchema()) {
              schema.setValue(
                "json",
                JSON.stringify({
                  type: "completed",
                  ...completionData,
                })
              );
            } else {
              schema.setValue("type", "completed");
              schema.setValue("reason", completionData.reason || "");
              schema.setValue("proofOfWork", completionData.proofOfWork || "");
              schema.setValue(
                "completionPercentage",
                completionData.completionPercentage || ""
              );
            }

            // Generate payload for this milestone
            const completed = new MilestoneCompleted({
              data: {
                type: "completed",
                ...completionData,
              },
              refUID: milestoneInstance.uid,
              schema,
              recipient: milestoneInstance.recipient,
            });

            // Generate payload
            const payload = await completed.payloadFor(0);
            allPayloads.push(payload);
          }

          // Submit all completions in a single transaction
          const result = await GapContract.multiAttest(
            walletSigner,
            allPayloads,
            changeStepperStep
          );

          // Notify indexer for each transaction
          if (result.tx.length > 0) {
            const txPromises = result.tx.map((tx: any) =>
              tx.hash
                ? fetchData(
                    INDEXER.ATTESTATION_LISTENER(
                      tx.hash as `0x${string}`,
                      chainId
                    ),
                    "POST",
                    {}
                  )
                : Promise.resolve()
            );
            await Promise.all(txPromises);
          }

          // Add to results
          results.push({
            milestoneInstances,
            grantInstances,
            result,
            isMultiple: true,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error completing multiple milestones:", error);
      throw error;
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsCompleting(true);
    setIsStepper(true);

    try {
      changeStepperStep("preparing");

      // Track if we are dealing with multi-grant milestone
      const isMultiGrant =
        milestone.mergedGrants && milestone.mergedGrants.length > 1;

      // Complete the milestone(s)
      const results = await completeMultipleGrantMilestones(milestone, data);

      // Poll for indexing completion
      changeStepperStep("indexing");
      let retries = 20; // Number of retries

      while (retries > 0) {
        await refreshProject()
          .then(async (fetchedProject) => {
            let allCompleted = true;

            // Check if source milestone is completed
            const sourceGrant = fetchedProject?.grants.find(
              (g) => g.uid.toLowerCase() === milestone.refUID.toLowerCase()
            );

            const sourceMilestone = sourceGrant?.milestones.find(
              (m) => m.uid.toLowerCase() === milestone.id.toLowerCase()
            );

            if (!sourceMilestone?.completed) {
              allCompleted = false;
            }

            // If multi-grant, check if all instances are completed
            if (isMultiGrant && milestone.mergedGrants) {
              for (const grant of milestone.mergedGrants) {
                const grantObj = fetchedProject?.grants.find(
                  (g) => g.uid.toLowerCase() === grant.grantId.toLowerCase()
                );

                const milestoneCopy = grantObj?.milestones.find(
                  (m) =>
                    m.uid.toLowerCase() === milestone.id.toLowerCase() ||
                    m.data.title === milestone.title
                );

                if (!milestoneCopy?.completed) {
                  allCompleted = false;
                  break;
                }
              }
            }

            if (allCompleted) {
              retries = 0;
              changeStepperStep("indexed");

              toast.success(
                isMultiGrant
                  ? "All milestone instances completed successfully!"
                  : MESSAGES.MILESTONES.COMPLETE.SUCCESS
              );

              handleCompleting(false);

              // Navigate to the milestones page
              router.push(
                PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                  fetchedProject?.uid as string,
                  milestone.refUID,
                  "milestones-and-updates"
                )
              );
              router.refresh();
            }

            retries -= 1;
            await new Promise((resolve) => setTimeout(resolve, 1500));
          })
          .catch(async () => {
            retries -= 1;
            await new Promise((resolve) => setTimeout(resolve, 1500));
          });
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error(MESSAGES.MILESTONES.COMPLETE.ERROR);
      errorManager(
        `Error completing milestone ${milestone.id} from grant(s)`,
        error,
        {
          milestoneData: milestone,
          formData: data,
        }
      );
    } finally {
      setIsCompleting(false);
      setIsStepper(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Description (optional)
        </label>
        <MarkdownEditor
          value={watch("description") || ""}
          onChange={(value: string) => setValue("description", value)}
          placeholderText="Describe what has been completed..."
        />
        {errors.description && (
          <span className="text-red-500 text-xs">
            {errors.description.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Proof of Work (optional)
        </label>
        <p className="text-sm text-gray-500">
          Provide a link that demonstrates your work. This could be a link to a
          tweet announcement, a dashboard, a Google Doc, a blog post, a video,
          or any other resource that highlights the progress or result of your
          work
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
          type="text"
          placeholder="URL to proof of work (e.g. GitHub PR, document, etc.)"
          className={cn(
            "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white",
            noProofCheckbox ? "opacity-50" : ""
          )}
          disabled={noProofCheckbox}
          {...register("proofOfWork")}
        />
        {errors.proofOfWork && (
          <span className="text-red-500 text-xs">
            {errors.proofOfWork.message}
          </span>
        )}
      </div>

      <div className="flex w-full flex-row items-center gap-4 py-2">
        <label
          htmlFor="completion-percentage"
          className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
        >
          What % of your grant is complete? (optional)
        </label>
        <div className="flex flex-col">
          <input
            id="completion-percentage"
            type="number"
            min="0"
            max="100"
            placeholder="0-100"
            className="w-24 rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
            {...register("completionPercentage")}
          />
          {errors.completionPercentage && (
            <p className="text-red-500 text-xs mt-1">
              {errors.completionPercentage.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-row gap-2 justify-end">
        <Button
          type="button"
          onClick={() => handleCompleting(false)}
          className="px-3 py-2 bg-transparent border border-gray-300 text-black dark:text-white"
          disabled={isSubmitting || isCompleting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          isLoading={isSubmitting || isCompleting}
          disabled={isSubmitting || isCompleting}
          className="px-3 py-2 bg-brand-blue text-white"
        >
          {milestone.mergedGrants && milestone.mergedGrants.length > 1
            ? "Complete All"
            : "Complete"}
        </Button>
      </div>
    </form>
  );
};
