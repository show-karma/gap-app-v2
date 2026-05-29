"use client";

import pluralize from "pluralize";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Utilities/Button";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { FormField, FormSchema } from "@/types/question-builder";

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
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <label key={option} className="flex items-center">
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
            {field.options?.map((option: string) => {
              // Sanitize option value to prevent react-hook-form path conflicts
              const sanitizedOption = option.replace(/[.[\]]/g, "_");
              return (
                <label key={option} className="flex items-center">
                  <input
                    {...register(`${field.id}.${sanitizedOption}`)}
                    type="checkbox"
                    value={option}
                    disabled={isSubmitting}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case "milestone":
        return <MilestonePreview field={field} isSubmitting={isSubmitting} />;

      case "metric":
        return <MetricPreview field={field} isSubmitting={isSubmitting} />;

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
                  Funding Requested *
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
                  Completion Criteria *
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

  // Simple Metric Preview Component
  function MetricPreview({ field, isSubmitting }: { field: FormField; isSubmitting: boolean }) {
    const [metrics, setMetrics] = useState<
      Array<{
        metric: string;
        dataSource: string;
        howItsMeasured: string;
        target: string;
      }>
    >([]);

    const maxMetrics = field.validation?.maxMetrics ?? Number.POSITIVE_INFINITY;
    const minMetrics = field.validation?.minMetrics ?? 0;

    const addMetric = () => {
      if (metrics.length < maxMetrics) {
        setMetrics([...metrics, { metric: "", dataSource: "", howItsMeasured: "", target: "" }]);
      }
    };

    const removeMetric = (index: number) => {
      if (metrics.length > minMetrics) {
        setMetrics(metrics.filter((_, i) => i !== index));
      }
    };

    const updateMetric = (index: number, key: string, value: string) => {
      const updated = [...metrics];
      updated[index] = { ...updated[index], [key]: value };
      setMetrics(updated);
    };

    const inputClass =
      "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100";

    return (
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Metric {index + 1}
              </h4>
              {metrics.length > minMetrics && (
                <button
                  type="button"
                  onClick={() => removeMetric(index)}
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
                  htmlFor={`metric-name-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Metric *
                </label>
                <input
                  id={`metric-name-${index}`}
                  type="text"
                  placeholder="e.g., Monthly active users"
                  value={metric.metric}
                  onChange={(e) => updateMetric(index, "metric", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`metric-data-source-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Data Source *
                </label>
                <input
                  id={`metric-data-source-${index}`}
                  type="text"
                  placeholder="e.g., Dune Analytics dashboard"
                  value={metric.dataSource}
                  onChange={(e) => updateMetric(index, "dataSource", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`metric-how-measured-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  How It's Measured *
                </label>
                <textarea
                  id={`metric-how-measured-${index}`}
                  placeholder="e.g., Count of unique wallet addresses interacting with the contract each month"
                  value={metric.howItsMeasured}
                  onChange={(e) => updateMetric(index, "howItsMeasured", e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`metric-target-${index}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Target *
                </label>
                <input
                  id={`metric-target-${index}`}
                  type="text"
                  placeholder="e.g., 10,000 monthly active users by Q4"
                  value={metric.target}
                  onChange={(e) => updateMetric(index, "target", e.target.value)}
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        {metrics.length < maxMetrics && (
          <button
            type="button"
            onClick={addMetric}
            disabled={isSubmitting}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            + Add Metric
          </button>
        )}

        {minMetrics > 0 && metrics.length < minMetrics && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Please add at least {minMetrics} {pluralize("metric", minMetrics)}
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
        {(schema.fields || []).map((field) => {
          if (field.type === "section_header") {
            return (
              <div
                key={field.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-2 pt-4 first:pt-0"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {field.label}
                </h3>
                {field.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <MarkdownPreview source={field.description} variant="inline" />
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={field.id}>
              <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>

              {field.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <MarkdownPreview source={field.description} variant="inline" />
                </div>
              )}

              {renderField(field)}

              {errors[field.id] && (
                <p className="text-red-500 text-sm mt-1">{errors[field.id]?.message as string}</p>
              )}
            </div>
          );
        })}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : schema.settings?.submitButtonText || "Submit"}
        </Button>
      </form>
    </div>
  );
}
