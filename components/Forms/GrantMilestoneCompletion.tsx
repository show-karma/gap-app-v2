"use client";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { OutputsSection } from "@/components/Forms/Outputs/OutputsSection";
import { Button } from "@/components/Utilities/Button";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useMilestone } from "@/hooks/useMilestone";
import { submitGranteeInvoice } from "@/src/features/payout-disbursement/services/payout-disbursement.service";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { INDEXER } from "@/utilities/indexer";

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
  invoiceRequired?: boolean;
  grantUID?: string;
  milestoneLabel?: string;
}

export const GrantMilestoneCompletionForm = ({
  milestone,
  handleCompleting,
  invoiceRequired = false,
  grantUID,
  milestoneLabel,
}: GrantMilestoneCompletionFormProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<{
    fileUrl: string;
    fileKey: string;
    fileName: string;
  } | null>(null);
  const pendingFileNameRef = useRef("");
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

      // Submit invoice after successful milestone completion
      if (invoiceFile && grantUID && milestoneLabel) {
        try {
          await submitGranteeInvoice(grantUID, {
            milestoneLabel,
            milestoneUID: milestone.uid,
            invoiceFileKey: invoiceFile.fileKey,
            invoiceFileUrl: invoiceFile.fileUrl,
          });
          toast.success("Invoice submitted successfully");
        } catch {
          toast.error(
            "Milestone completed but invoice submission failed. You can upload it later."
          );
        }
      }

      // Close the form after successful completion
      handleCompleting(false);
    } catch (_error) {
      // Don't close the form if there was an error
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

      {/* Invoice Upload Section */}
      {invoiceRequired && grantUID && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Upload Invoice (optional)
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Upload your invoice now to speed up payment processing.
          </p>
          {invoiceFile ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
              <PaperClipIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 flex-1 truncate">
                {invoiceFile.fileName}
              </span>
              <button
                type="button"
                className="p-0.5 rounded text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                onClick={() => setInvoiceFile(null)}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <FileUpload
              onFileSelect={(file) => { pendingFileNameRef.current = file.name; }}
              acceptedFormats=".pdf,.docx"
              description="PDF or DOCX (max 10MB)"
              useS3Upload
              skipDimensionValidation
              presignedUrlEndpoint={INDEXER.V2.MILESTONE_INVOICES.GRANTEE_PRESIGNED()}
              maxFileSize={10 * 1024 * 1024}
              allowedFileTypes={[
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]}
              onS3UploadComplete={(finalUrl, tempKey) => {
                setInvoiceFile({ fileUrl: finalUrl, fileKey: tempKey, fileName: pendingFileNameRef.current });
              }}
            />
          )}
        </div>
      )}

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
