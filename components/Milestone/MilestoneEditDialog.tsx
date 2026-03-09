"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMilestoneEdit } from "@/hooks/useMilestoneEdit";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";

const milestoneEditSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional(),
  endsAt: z.string().optional(),
  startsAt: z.string().optional(),
  priority: z.coerce.number().min(0).max(100).optional(),
});

type MilestoneEditFormData = z.infer<typeof milestoneEditSchema>;

// Convert a Unix timestamp (seconds) to YYYY-MM-DD for date input
const timestampToDateString = (timestamp: number | undefined): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toISOString().split("T")[0];
};

// Convert YYYY-MM-DD to Unix timestamp (seconds)
const dateStringToTimestamp = (dateStr: string): number | undefined => {
  if (!dateStr) return undefined;
  return Math.floor(new Date(dateStr).getTime() / 1000);
};

interface MilestoneEditDialogProps {
  milestone: UnifiedMilestone;
  projectId: string;
  buttonClassName?: string;
}

export function MilestoneEditDialog({
  milestone,
  projectId,
  buttonClassName,
}: MilestoneEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { editMilestone, isEditing } = useMilestoneEdit({
    milestoneUID: milestone.uid,
    projectId,
  });

  const initialValues: MilestoneEditFormData = useMemo(
    () => ({
      title: milestone.title,
      description: milestone.description || "",
      endsAt: timestampToDateString(milestone.endsAt),
      startsAt: timestampToDateString(milestone.startsAt),
      priority: undefined,
    }),
    [milestone]
  );

  const [formData, setFormData] = useState<MilestoneEditFormData>(initialValues);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof MilestoneEditFormData, string>>
  >({});

  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setValidationErrors({});
  }, [initialValues]);

  const handleOpen = useCallback(
    (open: boolean) => {
      if (open) {
        resetForm();
      }
      setIsOpen(open);
    },
    [resetForm]
  );

  const handleFieldChange = useCallback(
    (field: keyof MilestoneEditFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [validationErrors]
  );

  const hasChanges = useMemo(() => {
    return (
      formData.title !== initialValues.title ||
      formData.description !== initialValues.description ||
      formData.endsAt !== initialValues.endsAt ||
      formData.startsAt !== initialValues.startsAt ||
      (formData.priority !== undefined && formData.priority !== initialValues.priority)
    );
  }, [formData, initialValues]);

  const handleSubmit = useCallback(() => {
    const result = milestoneEditSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof MilestoneEditFormData, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof MilestoneEditFormData;
        fieldErrors[field] = issue.message;
      }
      setValidationErrors(fieldErrors);
      return;
    }

    const editData: Record<string, string | number | undefined> = {};

    if (formData.title !== initialValues.title) {
      editData.title = formData.title;
    }
    if (formData.description !== initialValues.description) {
      editData.description = formData.description;
    }
    if (formData.endsAt !== initialValues.endsAt) {
      editData.endsAt = dateStringToTimestamp(formData.endsAt || "");
    }
    if (formData.startsAt !== initialValues.startsAt) {
      editData.startsAt = dateStringToTimestamp(formData.startsAt || "");
    }
    if (formData.priority !== undefined && formData.priority !== initialValues.priority) {
      editData.priority = formData.priority;
    }

    editMilestone(
      { data: editData as Record<string, string | number> },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      }
    );
  }, [formData, initialValues, editMilestone]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(buttonClassName)}
          variant="ghost"
          size="sm"
          data-testid="edit-milestone-btn"
        >
          <PencilSquareIcon className="w-5 h-5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Milestone</DialogTitle>
          <DialogDescription>
            Update the milestone details below. Only changed fields will be saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="milestone-title" className="text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="milestone-title"
              placeholder="Enter milestone title"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              className={cn(validationErrors.title && "border-destructive")}
              data-testid="edit-milestone-title-input"
            />
            {validationErrors.title ? (
              <p className="text-sm text-destructive">{validationErrors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="milestone-description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="milestone-description"
              placeholder="Describe what will be accomplished"
              value={formData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={4}
              data-testid="edit-milestone-description-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="milestone-starts-at" className="text-sm font-medium text-foreground">
                Start Date
              </label>
              <Input
                id="milestone-starts-at"
                type="date"
                value={formData.startsAt}
                onChange={(e) => handleFieldChange("startsAt", e.target.value)}
                data-testid="edit-milestone-starts-at-input"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="milestone-ends-at" className="text-sm font-medium text-foreground">
                Due Date
              </label>
              <Input
                id="milestone-ends-at"
                type="date"
                value={formData.endsAt}
                onChange={(e) => handleFieldChange("endsAt", e.target.value)}
                data-testid="edit-milestone-ends-at-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="milestone-priority" className="text-sm font-medium text-foreground">
              Priority (0-100)
            </label>
            <Input
              id="milestone-priority"
              type="number"
              min={0}
              max={100}
              placeholder="Optional priority value"
              value={formData.priority !== undefined ? String(formData.priority) : ""}
              onChange={(e) => handleFieldChange("priority", e.target.value)}
              className={cn(validationErrors.priority && "border-destructive")}
              data-testid="edit-milestone-priority-input"
            />
            {validationErrors.priority ? (
              <p className="text-sm text-destructive">{validationErrors.priority}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isEditing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isEditing || !hasChanges}
            data-testid="edit-milestone-submit-btn"
          >
            {isEditing ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
