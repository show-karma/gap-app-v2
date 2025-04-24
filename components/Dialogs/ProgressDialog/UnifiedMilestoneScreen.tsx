"use client";
import { Button } from "@/components/Utilities/Button";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useState, useEffect } from "react";
import { MultiSelect } from "../../../components/Utilities/MultiSelect";
import { MilestoneForm } from "@/components/Forms/Milestone";
import { ProjectObjectiveForm } from "@/components/Forms/ProjectObjective";
import { useStepper } from "@/store/modals/txStepper";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useAccount, useSwitchChain } from "wagmi";
import { Milestone } from "@show-karma/karma-gap-sdk";
import { getGapClient, useGap } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { sanitizeObject, sanitizeInput } from "@/utilities/sanitize";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { MESSAGES } from "@/utilities/messages";
import { ProjectMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { useParams } from "next/navigation";

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
  const { project } = useProjectStore();
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
    label: grant.details?.data.title || "Untitled Grant",
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
        recipient: address || "0x00",
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
          toast.success("Roadmap milestone created successfully");
          await refetch();
          changeStepperStep("indexed");
          closeProgressModal();
        });
    } catch (error) {
      errorManager("Error creating roadmap milestone", error);
      toast.error("Failed to create roadmap milestone");
    } finally {
      setIsSubmitting(false);
      setIsStepper(false);
    }
  };

  // Create grant milestone(s) for selected grants
  const createGrantMilestones = async (data: MilestoneFormData) => {
    if (!gap || !project || selectedGrantIds.length === 0) return;

    let gapClient = gap;
    setIsSubmitting(true);

    try {
      // Process each selected grant
      const creationPromises = selectedGrantIds.map(async (grantId) => {
        const grant = grants.find((g) => g.uid === grantId);
        if (!grant) return null;

        // Switch chain if needed
        if (chain?.id !== grant.chainID) {
          await switchChainAsync?.({ chainId: grant.chainID });
          gapClient = getGapClient(grant.chainID);
        }

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

        const { walletClient, error } = await safeGetWalletClient(
          grant.chainID
        );

        if (error || !walletClient || !gapClient) {
          throw new Error("Failed to connect to wallet", { cause: error });
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

        await refetch();
        return { grant, result };
      });

      changeStepperStep("indexing");

      // Wait for all milestones to be created
      await Promise.all(creationPromises);

      changeStepperStep("indexed");
      await refetch();
      toast.success(
        `Created milestones for ${selectedGrantIds.length} grant(s) successfully`
      );
      closeProgressModal();
    } catch (error) {
      errorManager("Error creating grant milestones", error);
      toast.error("Failed to create grant milestones");
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
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            No grants found for this project. You can still create a roadmap
            milestone.
          </p>
        </div>
        <ProjectObjectiveForm
          stateHandler={(state) => {
            if (!state) closeProgressModal();
          }}
        />
      </div>
    );
  }

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
