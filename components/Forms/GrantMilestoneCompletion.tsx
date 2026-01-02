"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OutputsSection } from "@/components/Forms/Outputs/OutputsSection";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useMilestone } from "@/hooks/useMilestone";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

// Create form schema with zod
const formSchema = z.object({
  description: z
    .string()
    .min(3, { message: "Description must be at least 3 characters" })
    .or(z.literal(""))
    .optional(),
  completionPercentage: z
    .string()
    .refine(
      (value) => {
        if (!value) return true; // Allow empty value
        const num = Number(value);
        return !Number.isNaN(num) && num >= 0 && num <= 100;
      },
      {
        message: "Please enter a number between 0 and 100",
      }
    )
    .optional(),
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
  const { completeMilestone } = useMilestone();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
    control,
  } = useForm<MilestoneCompletedFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      completionPercentage: "",
      outputs: [],
      deliverables: [],
    },
  });

  const onSubmit = async (data: MilestoneCompletedFormData) => {
    setIsCompleting(true);
    try {
      await completeMilestone(milestone, {
        ...data,
        noProofCheckbox: true, // Always set to true since we removed the proof section
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Description (optional)
        </div>
        <MarkdownEditor
          value={watch("description") || ""}
          onChange={(value: string) => setValue("description", value)}
          placeholderText="Describe what has been completed..."
        />
        {errors.description && (
          <span className="text-red-500 text-xs">{errors.description.message}</span>
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
            <p className="text-red-500 text-xs mt-1">{errors.completionPercentage.message}</p>
          )}
        </div>
      </div>

      {/* Outputs Section */}
      <OutputsSection
        register={register}
        control={control}
        setValue={setValue}
        watch={watch}
        errors={errors}
        projectUID={milestone.uid}
        selectedCommunities={[]}
        selectedPrograms={[]}
        onCreateNewIndicator={() => {}}
        onIndicatorCreated={() => {}}
        labelStyle="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
      />

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
          disabled={isSubmitting || isCompleting || !isValid}
          className="px-3 py-2 bg-brand-blue text-white"
        >
          Complete
        </Button>
      </div>
    </form>
  );
};
