"use client";

import { Trash2 } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MilestoneData } from "@/types/whitelabel-entities";

interface MilestoneItemProps {
  index: number;
  milestone: MilestoneData;
  onUpdate: (data: MilestoneData) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
  errors?: {
    title?: { message?: string };
    description?: { message?: string };
    dueDate?: { message?: string };
    fundingRequested?: { message?: string };
    completionCriteria?: { message?: string };
  };
}

export const MilestoneItem: React.FC<MilestoneItemProps> = ({
  index,
  milestone,
  onUpdate,
  onRemove,
  canRemove,
  disabled = false,
  errors,
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dueDateAsDate = useMemo(() => {
    if (!milestone.dueDate) return undefined;
    const d = new Date(milestone.dueDate + "T00:00:00");
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [milestone.dueDate]);

  const handleFieldChange = (field: keyof MilestoneData, value: string) => {
    onUpdate({
      ...milestone,
      [field]: value,
    });
  };

  const handleDueDateSelect = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    handleFieldChange("dueDate", `${year}-${month}-${day}`);
  };

  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4"
      data-testid={`milestone-card-${index}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold" data-testid={`milestone-title-${index}`}>
          Milestone {index + 1}
        </h4>
        {canRemove && !disabled && (
          <Button
            type="button"
            onClick={onRemove}
            variant="ghost"
            size="icon-sm"
            data-testid={`remove-milestone-btn-${index}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`milestone-title-${index}`}>Title *</Label>
        <Input
          id={`milestone-title-${index}`}
          placeholder="Enter milestone title"
          value={milestone.title}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          disabled={disabled}
          data-testid={`milestone-title-input-${index}`}
        />
        {errors?.title?.message && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <MarkdownEditor
        label="Description"
        placeholder="Describe what will be accomplished in this milestone"
        value={milestone.description}
        onChange={(value) => handleFieldChange("description", value)}
        isDisabled={disabled}
        isRequired
        error={errors?.description?.message}
      />

      <div className="space-y-2">
        <span className="text-sm font-medium">Due Date *</span>
        <DatePicker
          selected={dueDateAsDate}
          onSelect={handleDueDateSelect}
          onInvalidInput={() => handleFieldChange("dueDate", "")}
          minDate={today}
          placeholder="MM/DD/YYYY"
          disabled={disabled}
          ariaLabel={`Milestone ${index + 1} due date`}
        />
        {errors?.dueDate?.message && (
          <p className="text-sm text-destructive">{errors.dueDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`milestone-funding-${index}`}>Funding Requested (Optional)</Label>
        <Input
          id={`milestone-funding-${index}`}
          placeholder="e.g., $5,000 USD or 5000"
          value={milestone.fundingRequested || ""}
          onChange={(e) => handleFieldChange("fundingRequested", e.target.value)}
          disabled={disabled}
          data-testid={`milestone-funding-input-${index}`}
        />
        {errors?.fundingRequested?.message && (
          <p className="text-sm text-destructive">{errors.fundingRequested.message}</p>
        )}
      </div>

      <MarkdownEditor
        label="Completion Criteria (Optional)"
        placeholder="Define criteria for milestone completion"
        value={milestone.completionCriteria || ""}
        onChange={(value) => handleFieldChange("completionCriteria", value)}
        isDisabled={disabled}
        isRequired={false}
        error={errors?.completionCriteria?.message}
      />
    </div>
  );
};
