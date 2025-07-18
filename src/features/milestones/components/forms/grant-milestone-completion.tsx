"use client";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Button } from "@/components/Utilities/Button";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { urlRegex } from "@/utilities/regexs/urlRegex";
import { useAccount } from "wagmi";
import { useGap, getGapClient } from "@/hooks/useGap";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { useStepper } from "@/store/modals/txStepper";
import { useProjectStore } from "@/src/features/projects/lib/store";
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
import { UnifiedMilestone } from "@/types/roadmap";
import { useMilestone } from "@/hooks/useMilestone";

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

export type MilestoneCompletedFormData = z.infer<typeof formSchema>;

interface GrantMilestoneCompletionFormProps {
  milestone: UnifiedMilestone;
  handleCompleting: (isCompleting: boolean) => void;
}

export const GrantMilestoneCompletionForm = ({
  milestone,
  handleCompleting,
}: GrantMilestoneCompletionFormProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [noProofCheckbox, setNoProofCheckbox] = useState(false);
  const { completeMilestone } = useMilestone();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
  } = useForm<MilestoneCompletedFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      proofOfWork: "",
      completionPercentage: "",
    },
  });

  const onSubmit = async (data: MilestoneCompletedFormData) => {
    setIsCompleting(true);
    try {
      await completeMilestone(milestone, {
        ...data,
        noProofCheckbox,
      });
      // Close the form after successful completion
      handleCompleting(false);
    } catch (error) {
      // Don't close the form if there was an error
      console.error("Error completing milestone:", error);
    } finally {
      setIsCompleting(false);
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
          className="px-3 py-2 bg-transparent border border-gray-300 text-black dark:text-white hover:bg-transparent hover:opacity-50 dark:hover:bg-transparent dark:hover:opacity-50"
          disabled={isSubmitting || isCompleting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          isLoading={isSubmitting || isCompleting}
          disabled={
            isSubmitting ||
            isCompleting ||
            !isValid ||
            (!noProofCheckbox && !watch("proofOfWork"))
          }
          className="px-3 py-2 bg-brand-blue text-white"
        >
          Complete
        </Button>
      </div>
    </form>
  );
};
