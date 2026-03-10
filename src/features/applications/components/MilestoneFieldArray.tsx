"use client";

import type React from "react";
import type { Control, FieldPath, UseFormTrigger } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import type { ApplicationQuestion, MilestoneData } from "@/types/whitelabel-entities";
import type { ApplicationFormData } from "../types";
import { MilestoneItem } from "./MilestoneItem";

interface MilestoneFieldArrayProps {
  control: Control<ApplicationFormData>;
  name: string;
  question: ApplicationQuestion;
  disabled?: boolean;
  trigger?: UseFormTrigger<ApplicationFormData>;
}

export const MilestoneFieldArray: React.FC<MilestoneFieldArrayProps> = ({
  control,
  name,
  question,
  disabled = false,
  trigger,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as never,
  });

  const maxMilestones = question.validation?.maxMilestones || 10;
  const minMilestones = question.validation?.minMilestones || 0;

  const handleAddMilestone = () => {
    const newMilestone: MilestoneData = {
      title: `Milestone ${fields.length + 1}`,
      description: "",
      dueDate: "",
    };
    append(newMilestone as never);
  };

  const handleRemoveMilestone = async (index: number) => {
    remove(index);
    if (trigger) {
      await trigger(name as FieldPath<ApplicationFormData>);
    }
  };

  const canAddMore = fields.length < maxMilestones;
  const canRemove = fields.length > minMilestones;

  return (
    <Controller
      name={name as FieldPath<ApplicationFormData>}
      control={control}
      render={({ fieldState }) => {
        const errorMessage =
          fieldState.error?.message ||
          (fieldState.error as Record<string, { message?: string }>)?.root?.message;

        return (
          <div className="space-y-4" data-testid="milestones-container">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {question.label}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </span>
              {question.description && (
                <MarkdownPreview
                  source={question.description}
                  className="text-sm text-zinc-500 dark:text-zinc-400"
                />
              )}
            </div>

            <div className="space-y-4" data-testid="milestones-list">
              {fields.map((field, index) => (
                <Controller
                  key={field.id}
                  name={`${name}.${index}` as FieldPath<ApplicationFormData>}
                  control={control}
                  render={({ field: milestoneField, fieldState }) => (
                    <MilestoneItem
                      index={index}
                      milestone={milestoneField.value as MilestoneData}
                      onUpdate={(data) => milestoneField.onChange(data)}
                      onRemove={() => handleRemoveMilestone(index)}
                      canRemove={canRemove}
                      disabled={disabled}
                      errors={
                        fieldState.error as unknown as Record<
                          string,
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                />
              ))}
            </div>

            {canAddMore && !disabled && (
              <Button
                type="button"
                onClick={handleAddMilestone}
                variant="outline"
                data-testid="add-milestone-btn"
              >
                Add Milestone
              </Button>
            )}

            {errorMessage && <p className="text-sm text-destructive mt-1">{errorMessage}</p>}

            {!errorMessage &&
              (question.required || question.validation?.minMilestones) &&
              minMilestones > 0 &&
              fields.length < minMilestones && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Please add at least {minMilestones} milestone
                  {minMilestones > 1 ? "s" : ""}
                </p>
              )}
          </div>
        );
      }}
    />
  );
};
