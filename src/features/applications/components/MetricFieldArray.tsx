"use client";

import type React from "react";
import type { Control, FieldPath, UseFormTrigger } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import type { ApplicationQuestion, MetricData } from "@/types/whitelabel-entities";
import type { ApplicationFormData } from "../types";
import { MetricItem } from "./MetricItem";

interface MetricFieldArrayProps {
  control: Control<ApplicationFormData>;
  name: string;
  question: ApplicationQuestion;
  disabled?: boolean;
  trigger?: UseFormTrigger<ApplicationFormData>;
}

export const MetricFieldArray: React.FC<MetricFieldArrayProps> = ({
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

  const maxMetrics = question.validation?.maxMetrics || 10;
  const minMetrics = question.validation?.minMetrics || 0;

  const handleAddMetric = () => {
    const newMetric: MetricData = {
      metric: "",
      dataSource: "",
      howItsMeasured: "",
      target: "",
    };
    append(newMetric as never);
  };

  const handleRemoveMetric = async (index: number) => {
    remove(index);
    if (trigger) {
      await trigger(name as FieldPath<ApplicationFormData>);
    }
  };

  const canAddMore = fields.length < maxMetrics;
  const canRemove = fields.length > minMetrics;

  return (
    <Controller
      name={name as FieldPath<ApplicationFormData>}
      control={control}
      render={({ fieldState }) => {
        const errorMessage =
          fieldState.error?.message ||
          (fieldState.error as Record<string, { message?: string }>)?.root?.message;

        return (
          <div className="space-y-4" data-testid="metrics-container">
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

            <div className="space-y-4" data-testid="metrics-list">
              {fields.map((field, index) => (
                <Controller
                  key={field.id}
                  name={`${name}.${index}` as FieldPath<ApplicationFormData>}
                  control={control}
                  render={({ field: metricField, fieldState }) => (
                    <MetricItem
                      index={index}
                      metric={metricField.value as MetricData}
                      onUpdate={(data) => metricField.onChange(data)}
                      onRemove={() => handleRemoveMetric(index)}
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
                onClick={handleAddMetric}
                variant="outline"
                data-testid="add-metric-btn"
              >
                Add Metric
              </Button>
            )}

            {errorMessage && <p className="text-sm text-destructive mt-1">{errorMessage}</p>}

            {!errorMessage &&
              (question.required || question.validation?.minMetrics) &&
              minMetrics > 0 &&
              fields.length < minMetrics && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Please add at least {minMetrics} metric
                  {minMetrics > 1 ? "s" : ""}
                </p>
              )}
          </div>
        );
      }}
    />
  );
};
