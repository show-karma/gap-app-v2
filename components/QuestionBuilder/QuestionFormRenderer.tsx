"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Utilities/Button";
import type { FormSchema } from "@/types/question-builder";

interface QuestionFormRendererProps {
  schema: FormSchema;
  onSubmit?: (data: Record<string, any>) => void;
  className?: string;
  isSubmitting?: boolean;
}

export function QuestionFormRenderer({
  schema,
  onSubmit,
  className = "",
  isSubmitting = false,
}: QuestionFormRendererProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onFormSubmit = (data: Record<string, any>) => {
    onSubmit?.(data);
  };

  const renderField = (field: any) => {
    const commonProps = {
      ...register(field.id, {
        required: field.required ? `${field.label} is required` : false,
      }),
      className:
        "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300",
      placeholder: field.placeholder,
      disabled: isSubmitting,
    };

    switch (field.type) {
      case "text":
      case "email":
      case "url":
        return <input {...commonProps} type={field.type} />;

      case "number":
        return (
          <input
            {...commonProps}
            type="number"
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case "date":
        return <input {...commonProps} type="date" />;

      case "textarea":
        return <textarea {...commonProps} rows={4} />;

      case "select":
        return (
          <select {...commonProps}>
            <option value="">Select an option</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(field.id, {
                    required: field.required ? `${field.label} is required` : false,
                  })}
                  type="radio"
                  value={option}
                  disabled={isSubmitting}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(`${field.id}.${index}`)}
                  type="checkbox"
                  value={option}
                  disabled={isSubmitting}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case "milestone":
        return <MilestonePreview field={field} isSubmitting={isSubmitting} />;

      default:
        return <div>Unsupported field type: {field.type}</div>;
    }
  };

  // Simple Milestone Preview Component
  function MilestonePreview({ field, isSubmitting }: { field: any; isSubmitting: boolean }) {
    const [milestones, setMilestones] = useState<
      Array<{
        title: string;
        description: string;
        dueDate: string;
        fundingRequested: string;
        completionCriteria: string;
      }>
    >([]);

    const maxMilestones = field.validation?.maxMilestones || 10;
    const minMilestones = field.validation?.minMilestones || 0;

    const addMilestone = () => {
      if (milestones.length < maxMilestones) {
        setMilestones([
          ...milestones,
          {
            title: "",
            description: "",
            dueDate: "",
            fundingRequested: "",
            completionCriteria: "",
          },
        ]);
      }
    };

    const removeMilestone = (index: number) => {
      if (milestones.length > minMilestones) {
        setMilestones(milestones.filter((_, i) => i !== index));
      }
    };

    const updateMilestone = (index: number, key: string, value: string) => {
      const updated = [...milestones];
      updated[index] = { ...updated[index], [key]: value };
      setMilestones(updated);
    };

    const inputClass =
      "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

    return (
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Milestone {index + 1}
              </h4>
              {milestones.length > minMilestones && (
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  disabled={isSubmitting}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor={`milestone-title-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Title *
                </label>
                <input
                  id={`milestone-title-${index}`}
                  type="text"
                  placeholder="Enter milestone title"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, "title", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`milestone-description-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Description *
                </label>
                <textarea
                  id={`milestone-description-${index}`}
                  placeholder="Describe what will be accomplished"
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, "description", e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`milestone-due-date-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Due Date *
                </label>
                <input
                  id={`milestone-due-date-${index}`}
                  type="date"
                  value={milestone.dueDate}
                  onChange={(e) => updateMilestone(index, "dueDate", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`milestone-funding-requested-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Funding Requested (Optional)
                </label>
                <input
                  id={`milestone-funding-requested-${index}`}
                  type="text"
                  placeholder="e.g., $5,000 USD"
                  value={milestone.fundingRequested}
                  onChange={(e) => updateMilestone(index, "fundingRequested", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`milestone-completion-criteria-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Completion Criteria (Optional)
                </label>
                <textarea
                  id={`milestone-completion-criteria-${index}`}
                  placeholder="Define criteria for milestone completion"
                  value={milestone.completionCriteria}
                  onChange={(e) => updateMilestone(index, "completionCriteria", e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        {milestones.length < maxMilestones && (
          <button
            type="button"
            onClick={addMilestone}
            disabled={isSubmitting}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            + Add Milestone
          </button>
        )}

        {minMilestones > 0 && milestones.length < minMilestones && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Please add at least {minMilestones} milestone{minMilestones > 1 ? "s" : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{schema.title}</h2>
        {schema.description && (
          <p className="text-gray-600 dark:text-gray-400">{schema.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {(schema.fields || []).map((field) => (
          <div key={field.id}>
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </div>

            {field.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{field.description}</p>
            )}

            {renderField(field)}

            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">{errors[field.id]?.message as string}</p>
            )}
          </div>
        ))}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : schema.settings?.submitButtonText || "Submit"}
        </Button>
      </form>
    </div>
  );
}
