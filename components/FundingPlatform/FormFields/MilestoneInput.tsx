"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import type { FC } from "react";
import type { Control, FieldError, UseFormRegister } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import type { IFormField, IMilestoneData } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface MilestoneInputProps {
  field: IFormField;
  control: Control<any>;
  fieldKey: string;
  error?: FieldError | any;
  isLoading?: boolean;
}

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

export const MilestoneInput: FC<MilestoneInputProps> = ({
  field,
  control,
  fieldKey,
  error,
  isLoading = false,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldKey,
  });

  const maxMilestones = field.validation?.maxMilestones || 10;
  const minMilestones = field.validation?.minMilestones || 0;

  const handleAddMilestone = () => {
    const newMilestone: IMilestoneData = {
      title: "",
      description: "",
      dueDate: "",
      fundingRequested: "",
      completionCriteria: "",
    };
    append(newMilestone);
  };

  const handleRemoveMilestone = (index: number) => {
    remove(index);
  };

  const canAddMore = fields.length < maxMilestones;
  const canRemove = fields.length > minMilestones;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Field Label and Description */}
      <div>
        <span className={labelStyle}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {field.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>
        )}
      </div>

      {/* Milestone Items */}
      <div className="space-y-4">
        {fields.map((item, index) => (
          <div
            key={item.id}
            className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Milestone {index + 1}
              </h4>
              {canRemove && !isLoading && (
                <Button
                  type="button"
                  onClick={() => handleRemoveMilestone(index)}
                  variant="custom"
                  className="!p-2 !bg-red-500 hover:!bg-red-600 text-white"
                  aria-label={`Remove milestone ${index + 1}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Title */}
              <Controller
                name={`${fieldKey}.${index}.title`}
                control={control}
                rules={{ required: "Title is required" }}
                render={({ field: titleField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-title`} className={labelStyle}>
                      Title *
                    </label>
                    <input
                      {...titleField}
                      id={`${fieldKey}-${index}-title`}
                      type="text"
                      placeholder="Enter milestone title"
                      disabled={isLoading}
                      className={cn(
                        inputStyle,
                        fieldState.error && "border-red-500 dark:border-red-500"
                      )}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-400 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Description */}
              <Controller
                name={`${fieldKey}.${index}.description`}
                control={control}
                rules={{ required: "Description is required" }}
                render={({ field: descField, fieldState }) => (
                  <MarkdownEditor
                    label="Description *"
                    placeholder="Describe what will be accomplished in this milestone"
                    value={descField.value || ""}
                    onChange={descField.onChange}
                    onBlur={descField.onBlur}
                    error={fieldState.error?.message}
                    isRequired={true}
                    isDisabled={isLoading}
                    id={`${fieldKey}-${index}-description`}
                    height={200}
                    minHeight={180}
                  />
                )}
              />

              {/* Due Date */}
              <Controller
                name={`${fieldKey}.${index}.dueDate`}
                control={control}
                rules={{ required: "Due date is required" }}
                render={({ field: dateField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-dueDate`} className={labelStyle}>
                      Due Date *
                    </label>
                    <input
                      {...dateField}
                      id={`${fieldKey}-${index}-dueDate`}
                      type="date"
                      disabled={isLoading}
                      className={cn(
                        inputStyle,
                        fieldState.error && "border-red-500 dark:border-red-500"
                      )}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-400 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Funding Requested - Optional */}
              <Controller
                name={`${fieldKey}.${index}.fundingRequested`}
                control={control}
                render={({ field: fundingField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-fundingRequested`} className={labelStyle}>
                      Funding Requested (Optional)
                    </label>
                    <input
                      {...fundingField}
                      id={`${fieldKey}-${index}-fundingRequested`}
                      type="text"
                      placeholder="e.g., $5,000 USD or 5000"
                      disabled={isLoading}
                      className={cn(
                        inputStyle,
                        fieldState.error && "border-red-500 dark:border-red-500"
                      )}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-400 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Completion Criteria - Optional */}
              <Controller
                name={`${fieldKey}.${index}.completionCriteria`}
                control={control}
                render={({ field: criteriaField, fieldState }) => (
                  <MarkdownEditor
                    label="Completion Criteria (Optional)"
                    placeholder="Define criteria for milestone completion"
                    value={criteriaField.value || ""}
                    onChange={criteriaField.onChange}
                    onBlur={criteriaField.onBlur}
                    error={fieldState.error?.message}
                    isRequired={false}
                    isDisabled={isLoading}
                    id={`${fieldKey}-${index}-completionCriteria`}
                    height={150}
                    minHeight={130}
                  />
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Milestone Button */}
      {canAddMore && !isLoading && (
        <Button
          type="button"
          onClick={handleAddMilestone}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          + Add Milestone
        </Button>
      )}

      {/* Field-level Error */}
      {error && typeof error === "object" && "message" in error && (
        <p className="text-sm text-red-400 mt-1">{error.message as string}</p>
      )}

      {/* Helpful hints */}
      {minMilestones > 0 && fields.length < minMilestones && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Please add at least {minMilestones} milestone{minMilestones > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
};
