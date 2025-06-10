"use client";
import { ProjectObjectiveForm } from "@/components/Forms/ProjectObjective";
import { Button } from "@/components/Utilities/Button";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { useStepper } from "@/store/modals/txStepper";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { sanitizeInput, sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Transaction } from "ethers";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";
import { MultiSelect } from "../../../components/Utilities/MultiSelect";

// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Define the form schema for creating milestones
const milestoneSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(50, { message: "Title must be at most 50 characters" }),
  description: z.string().min(3, { message: "Description is required" }),
  priority: z
    .literal("")
    .transform(() => undefined)
    .or(z.coerce.number())
    .optional(),
  dates: z
    .object({
      endsAt: z.date({
        required_error: "End date is required",
      }),
      startsAt: z.date().optional(),
    })
    .optional()
    .refine(
      (data) => {
        // Only validate if both dates exist
        if (!data || !data.startsAt || !data.endsAt) return true;

        // Ensure start date is not after end date
        return data.startsAt <= data.endsAt;
      },
      {
        message: "Start date must be before the end date",
        path: ["startsAt"],
      }
    ),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

export const UnifiedMilestoneScreen = () => {
  const { project, refreshProject } = useProjectStore();
  const { closeProgressModal } = useProgressModalStore();
  const [selectedGrantIds, setSelectedGrantIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grants: IGrantResponse[] = project?.grants || [];
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();
  const { projectId } = useParams();
  const { refetch } = useAllMilestones(projectId as string);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting: formSubmitting, isValid },
    setValue,
    watch,
  } = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      priority: undefined,
    },
  });

  const grantOptions = grants.map((grant) => ({
    value: grant.uid,
    label: `${grant.details?.data.title || "Untitled Grant"}`,
    chainId: grant.chainID,
  }));

  const handleGrantSelectionChange = (selectedIds: string[]) => {
    setSelectedGrantIds(selectedIds);
  };

  // Create a roadmap milestone (project objective)
  const createRoadmapMilestone = async (data: MilestoneFormData) => {
    if (!gap || !project) return;
    let gapClient = gap;
    setIsSubmitting(true);

    try {
      if (chain?.id !== project.chainID) {
        await switchChainAsync?.({ chainId: project.chainID });
        gapClient = getGapClient(project.chainID);
      }

      const newObjective = new ProjectMilestone({
        data: sanitizeObject({
          title: data.title,
          text: data.description,
          type: "project-milestone",
        }),
        schema: gapClient.findSchema("ProjectMilestone"),
        refUID: project.uid,
        recipient: (address as `0x${string}`) || "0x00",
      });

      const { walletClient, error } = await safeGetWalletClient(
        project.chainID
      );

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);
      const sanitizedData = {
        title: sanitizeInput(data.title),
        text: sanitizeInput(data.description),
      };

      await newObjective
        .attest(walletSigner as any, sanitizedData, changeStepperStep)
        .then(async (res) => {
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, project.chainID),
              "POST",
              {}
            );
          } else {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(newObjective.uid, project.chainID),
              "POST",
              {}
            );
          }

          changeStepperStep("indexing");

          // More robust refetch with multiple attempts
          await tryRefetch();

          toast.success("Roadmap milestone created successfully");
          changeStepperStep("indexed");
          closeProgressModal();
        });
    } catch (error) {
      errorManager("Error creating roadmap milestone", error);
      toast.error("Failed to create roadmap milestone");
      console.log(error);
    } finally {
      setIsSubmitting(false);
      setIsStepper(false);
    }
  };

  // Function to attempt multiple refetches with delays between attempts
  const tryRefetch = async (attempts = 3, delayMs = 2000) => {
    for (let i = 0; i < attempts; i++) {
      await refetch();
      await refreshProject();
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  };

  // Create grant milestone(s) for selected grants
  const createGrantMilestones = async (data: MilestoneFormData) => {
    if (!gap || !project || selectedGrantIds.length === 0) return;

    setIsSubmitting(true);
    setIsStepper(true);

    let toastsToRemove: string[] = [];

    try {
      // Group grants by chain ID to process each network separately
      const grantsByChain: Record<
        number,
        { grant: IGrantResponse; index: number }[]
      > = {};

      // Build the groups by chain
      selectedGrantIds.forEach((grantId, index) => {
        const grant = grants.find((g) => g.uid === grantId);
        if (!grant) return;

        if (!grantsByChain[grant.chainID]) {
          grantsByChain[grant.chainID] = [];
        }

        grantsByChain[grant.chainID].push({ grant, index });
      });

      // Sort chain IDs to prioritize the user's current chain
      const sortedChainIds = Object.keys(grantsByChain).sort((a, b) => {
        const aId = Number(a);
        const bId = Number(b);

        // If user is on chain A, prioritize A
        if (chain?.id === aId) return -1;
        // If user is on chain B, prioritize B
        if (chain?.id === bId) return 1;
        // Otherwise, just sort numerically as fallback
        return aId - bId;
      });

      // Process each chain group in the prioritized order
      for (const chainIdStr of sortedChainIds) {
        let gapClient = gap;
        const chainId = Number(chainIdStr);
        const chainGrants = grantsByChain[chainId];
        const chainName = chainNameDictionary(chainId);

        changeStepperStep("preparing");
        // Notify user we're processing grants on this chain
        toast.loading(`Creating milestone`, {
          id: `chain-${chainId}`,
        });
        toastsToRemove.push(`chain-${chainId}`);

        // Switch chain if needed
        if (chain?.id !== chainId) {
          await switchChainAsync?.({ chainId });
          gapClient = getGapClient(chainId);
        }

        // If there's only one grant on this chain, process it normally
        if (chainGrants.length === 1) {
          const { grant } = chainGrants[0];

          const milestone = sanitizeObject({
            title: data.title,
            description: data.description,
            endsAt: data.dates?.endsAt
              ? data.dates.endsAt.getTime() / 1000
              : undefined,
            startsAt: data.dates?.startsAt
              ? data.dates.startsAt.getTime() / 1000
              : undefined,
            priority:
              data.priority !== undefined && data.priority !== null
                ? data.priority
                : undefined,
          });

          const milestoneToAttest = new Milestone({
            refUID: grant.uid,
            schema: gapClient.findSchema("Milestone"),
            recipient: address as `0x${string}`,
            data: milestone,
          });

          const { walletClient, error } = await safeGetWalletClient(chainId);

          if (error || !walletClient || !gapClient) {
            throw new Error(`Failed to connect to wallet on ${chainName}`, {
              cause: error,
            });
          }

          const walletSigner = await walletClientToSigner(walletClient);

          const result = await milestoneToAttest.attest(
            walletSigner as any,
            changeStepperStep
          );

          // Handle indexer notification
          const txHash = result?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, milestoneToAttest.chainID),
              "POST",
              {}
            );
          }

          toast.success(`Created milestone successfully`, {
            id: `chain-${chainId}`,
          });
        } else {
          // Multiple grants on the same chain - use attestToMultipleGrants
          // Get the first grant as reference
          const firstGrant = chainGrants[0].grant;

          const milestone = sanitizeObject({
            title: data.title,
            description: data.description,
            endsAt: data.dates?.endsAt
              ? data.dates.endsAt.getTime() / 1000
              : undefined,
            startsAt: data.dates?.startsAt
              ? data.dates.startsAt.getTime() / 1000
              : undefined,
            priority:
              data.priority !== undefined && data.priority !== null
                ? data.priority
                : undefined,
          });

          const milestoneToAttest = new Milestone({
            // We'll use the first grant as reference, but it will be attested to all selected grants
            refUID: firstGrant.uid,
            schema: gapClient.findSchema("Milestone"),
            recipient: address as `0x${string}`,
            data: milestone,
          });

          const { walletClient, error } = await safeGetWalletClient(chainId);

          if (error || !walletClient || !gapClient) {
            throw new Error(`Failed to connect to wallet on ${chainName}`, {
              cause: error,
            });
          }

          const walletSigner = await walletClientToSigner(walletClient);

          // Instead of using indices, directly use grant UIDs
          const grantUIDs = chainGrants.map(
            (item) => item.grant.uid as `0x${string}`
          );

          // Create separate milestone objects for each grant
          const allPayloads: any[] = [];

          for (const grantUID of grantUIDs) {
            // Create a new milestone for each grant with direct reference
            const grantMilestone = new Milestone({
              schema: milestoneToAttest.schema,
              recipient: milestoneToAttest.recipient,
              data: milestoneToAttest.data,
              refUID: grantUID, // Direct reference to the grant UID
            });

            // Generate payload for this grant
            const payload = await grantMilestone.multiAttestPayload();
            // Add each item from payload to allPayloads
            payload.forEach((item) => allPayloads.push(item));
          }

          // Use the GapContract to submit all attestations in a single transaction
          const result = await GapContract.multiAttest(
            walletSigner as any,
            allPayloads.map((p) => p[1]),
            changeStepperStep
          );

          // Handle indexer notification for each tx
          if (result.tx.length > 0) {
            const txPromises = result.tx.map((tx: Transaction) =>
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

          toast.success(`Created milestones on ${chainName}`, {
            id: `chain-${chainId}`,
          });
        }
      }

      changeStepperStep("indexing");

      // Wait a bit for indexing and perform multiple refetch attempts
      await sleep(1500);
      await tryRefetch();

      changeStepperStep("indexed");

      router.push(
        PAGES.PROJECT.UPDATES(project?.details?.data.slug || project?.uid || "")
      );
      closeProgressModal();
    } catch (error) {
      errorManager("Error creating grant milestones", error);
      toastsToRemove.forEach((toastId) => toast.remove(toastId));
      console.log(error);
    } finally {
      setIsSubmitting(false);
      setIsStepper(false);
    }
  };

  const onSubmit: SubmitHandler<MilestoneFormData> = async (data) => {
    // For grant milestones, validate that endsAt is provided
    if (selectedGrantIds.length > 0 && !data.dates?.endsAt) {
      toast.error("End date is required for grant milestones");
      return;
    }

    // Validate dates relationship if both exist
    if (data.dates?.startsAt && data.dates?.endsAt) {
      if (data.dates.startsAt > data.dates.endsAt) {
        toast.error("Start date must be before the end date");
        return;
      }
    }

    if (selectedGrantIds.length === 0) {
      // Create a roadmap milestone
      await createRoadmapMilestone(data);
    } else {
      // Create grant milestone(s)
      await createGrantMilestones(data);
    }
  };

  // If no grants exist - simpler UI for roadmap milestones only
  if (!grants.length && project) {
    return (
      <div className="flex flex-col gap-6">
        <ProjectObjectiveForm
          stateHandler={(state) => {
            if (!state) closeProgressModal();
          }}
        />
      </div>
    );
  }

  // Group grants by chain for better display
  const grantsByChain = selectedGrantIds.reduce((acc, grantId) => {
    const grant = grants.find((g) => g.uid === grantId);
    if (!grant) return acc;

    const chainId = grant.chainID;
    if (!acc[chainId]) {
      acc[chainId] = {
        chainId,
        chainName: chainNameDictionary(chainId),
        grants: [],
      };
    }

    acc[chainId].grants.push(grant);
    return acc;
  }, {} as Record<number, { chainId: number; chainName: string; grants: IGrantResponse[] }>);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <label className="text-sm font-bold text-black dark:text-zinc-100">
          Select Grant(s) (Optional)
        </label>

        <MultiSelect
          options={grantOptions}
          onChange={handleGrantSelectionChange}
          value={selectedGrantIds}
          placeholder="Search and select grants..."
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Title Field - For Both Types */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-black dark:text-zinc-100">
            Title *
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
            placeholder="Milestone title"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-red-500 text-sm">{errors.title.message}</p>
          )}
        </div>

        {/* Description Field - For Both Types */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-black dark:text-zinc-100">
            Description *
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value || ""}
                onChange={(value: string) => field.onChange(value)}
                placeholderText="Describe this milestone..."
              />
            )}
          />
          {errors.description && (
            <p className="text-red-500 text-sm">{errors.description.message}</p>
          )}
        </div>

        {/* Grant-specific Fields - Only Show If Grants Selected */}
        {selectedGrantIds.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-black dark:text-zinc-100">
                Priority (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                {...register("priority", {
                  setValueAs: (value) => parseInt(value, 10),
                  required: false,
                })}
              >
                <option value={0}>Select priority</option>
                {[1, 2, 3, 4, 5].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-row gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-black dark:text-zinc-100">
                  Start Date (Optional)
                </label>
                <Controller
                  control={control}
                  name="dates.startsAt"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onSelect={(date: Date) => {
                        field.onChange(date);
                      }}
                      maxDate={watch("dates.endsAt")}
                      placeholder="Select start date"
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-black dark:text-zinc-100">
                  End Date *
                </label>
                <Controller
                  control={control}
                  name="dates.endsAt"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onSelect={(date: Date) => {
                        field.onChange(date);
                      }}
                      minDate={watch("dates.startsAt") || new Date()}
                      placeholder="Select end date"
                      className="w-full"
                    />
                  )}
                />
                {errors.dates?.endsAt && (
                  <p className="text-red-500 text-sm">
                    {errors.dates?.endsAt.message}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Display warning if grants are on multiple chains */}
        {selectedGrantIds.length > 0 &&
          Object.keys(grantsByChain).length > 1 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                You are creating milestones across multiple chains. You will
                need to approve transactions for each chain separately.
              </p>
            </div>
          )}

        <div className="flex flex-row gap-2 justify-end mt-4">
          <Button
            type="button"
            onClick={closeProgressModal}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            isLoading={isSubmitting}
            className="px-4 py-2 bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            Create Milestone
          </Button>
        </div>
      </form>
    </div>
  );
};
