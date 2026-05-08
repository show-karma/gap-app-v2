"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MilestoneEditData } from "@/hooks/useMilestoneEdit";
import { useMilestoneEdit } from "@/hooks/useMilestoneEdit";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

const editMilestoneSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .refine((val) => val.trim().length > 0, "Title cannot be only whitespace"),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  priority: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().min(0).max(10).optional()
  ),
});

type EditMilestoneFormData = z.infer<typeof editMilestoneSchema>;

interface MilestoneEditDialogProps {
  milestone: UnifiedMilestone;
  isOpen: boolean;
  onClose: () => void;
  /** Override project UID when not on a project page (e.g. admin review page) */
  projectUid?: string;
  /** Override project slug for query invalidation */
  projectSlug?: string;
  /** Program ID for admin on-chain edits */
  programId?: string;
  /** Exclude the start date field from display and submission (e.g. admin review flow) */
  excludeStartDate?: boolean;
}

function unixToDateInput(unix?: number): string {
  if (!unix) return "";
  const date = new Date(unix * 1000);
  return date.toISOString().split("T")[0];
}

function dateInputToUnix(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

export const MilestoneEditDialog = ({
  milestone,
  isOpen,
  onClose,
  projectUid,
  projectSlug,
  programId,
  excludeStartDate = false,
}: MilestoneEditDialogProps) => {
  const { isEditing, editMilestone } = useMilestoneEdit(
    projectUid ? { projectUid, projectSlug, programId } : undefined
  );
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  const grantMilestone = milestone.source.grantMilestone?.milestone;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditMilestoneFormData>({
    resolver: zodResolver(editMilestoneSchema),
    defaultValues: {
      title: milestone.title || "",
      description: milestone.description || "",
      startsAt: unixToDateInput(milestone.startsAt),
      endsAt: unixToDateInput(milestone.endsAt),
      priority: grantMilestone?.priority ?? undefined,
    },
  });

  const onSubmit = async (data: EditMilestoneFormData) => {
    setError(null);
    try {
      const editData: MilestoneEditData = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        startsAt: excludeStartDate ? undefined : dateInputToUnix(data.startsAt),
        endsAt: dateInputToUnix(data.endsAt),
        priority: data.priority,
      };

      await editMilestone(milestone, editData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit milestone");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilSquareIcon className="w-5 h-5" />
            Edit Milestone
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="milestone-title"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title *
            </label>
            <Input
              id="milestone-title"
              {...register("title")}
              placeholder="Milestone title"
              disabled={isEditing}
            />
            {errors.title ? <p className="text-sm text-red-500">{errors.title.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="milestone-description"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Description
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <MarkdownEditor
                  id="milestone-description"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Milestone description"
                  isDisabled={isEditing}
                  maxLength={5000}
                  showCharacterCount
                  height={220}
                  minHeight={200}
                  error={errors.description?.message}
                />
              )}
            />
          </div>

          <div className={excludeStartDate ? "" : "grid grid-cols-2 gap-4"}>
            {!excludeStartDate && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="milestone-starts-at"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Start Date
                </label>
                <Input
                  id="milestone-starts-at"
                  type="date"
                  {...register("startsAt")}
                  disabled={isEditing}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="milestone-ends-at"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Due Date
              </label>
              <Input
                id="milestone-ends-at"
                type="date"
                {...register("endsAt")}
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="milestone-priority"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Priority (0-10)
            </label>
            <Input
              id="milestone-priority"
              type="number"
              min={0}
              max={10}
              {...register("priority")}
              disabled={isEditing}
            />
            {errors.priority ? (
              <p className="text-sm text-red-500">{errors.priority.message}</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              className="bg-transparent border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              onClick={onClose}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-blue text-white hover:bg-brand-blue/90"
              disabled={isEditing}
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
