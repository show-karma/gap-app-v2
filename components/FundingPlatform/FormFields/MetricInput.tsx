"use client";

import { TrashIcon } from "@heroicons/react/24/solid";
import pluralize from "pluralize";
import type { FC } from "react";
import type { Control } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import { METRIC_FIELD_REQUIRED } from "@/components/FundingPlatform/ApplicationView/lib/repeatable-item-schemas";
import { Button } from "@/components/Utilities/Button";
import type { IFormField, IMetricData } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

/** Asterisk shown next to required sub-field labels, driven by the schema. */
const RequiredMark: FC = () => <span className="text-red-500 ml-1">{" *"}</span>;

interface MetricInputProps {
  field: IFormField;
  // The intake form schema is built dynamically, so there is no static form
  // type to parameterise the control with (matches MilestoneInput).
  // biome-ignore lint/suspicious/noExplicitAny: dynamic RHF control
  control: Control<any>;
  fieldKey: string;
  // Field-array level error from RHF; only `.message` is read here.
  error?: { message?: string };
  isLoading?: boolean;
}

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

export const MetricInput: FC<MetricInputProps> = ({
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

  const maxMetrics = field.validation?.maxMetrics ?? Number.POSITIVE_INFINITY;
  const minMetrics = field.validation?.minMetrics ?? 0;

  const handleAddMetric = () => {
    const newMetric: IMetricData = {
      metric: "",
      dataSource: "",
      howItsMeasured: "",
      target: "",
    };
    append(newMetric);
  };

  const handleRemoveMetric = (index: number) => {
    remove(index);
  };

  const canAddMore = fields.length < maxMetrics;
  const canRemove = fields.length > minMetrics;

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <span className={labelStyle}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {field.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((item, index) => (
          <div
            key={item.id}
            className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Metric {index + 1}
              </h4>
              {canRemove && !isLoading && (
                <Button
                  type="button"
                  onClick={() => handleRemoveMetric(index)}
                  variant="custom"
                  className="!p-2 !bg-destructive hover:!bg-destructive/90 text-destructive-foreground"
                  aria-label={`Remove metric ${index + 1}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Metric */}
              <Controller
                name={`${fieldKey}.${index}.metric`}
                control={control}
                render={({ field: metricField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-metric`} className={labelStyle}>
                      Metric
                      {METRIC_FIELD_REQUIRED.metric && <RequiredMark />}
                    </label>
                    <input
                      {...metricField}
                      id={`${fieldKey}-${index}-metric`}
                      type="text"
                      placeholder="e.g., Monthly active users"
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

              {/* Data Source */}
              <Controller
                name={`${fieldKey}.${index}.dataSource`}
                control={control}
                render={({ field: sourceField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-dataSource`} className={labelStyle}>
                      Data Source
                      {METRIC_FIELD_REQUIRED.dataSource && <RequiredMark />}
                    </label>
                    <input
                      {...sourceField}
                      id={`${fieldKey}-${index}-dataSource`}
                      type="text"
                      placeholder="e.g., Dune Analytics dashboard"
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

              {/* How It's Measured */}
              <Controller
                name={`${fieldKey}.${index}.howItsMeasured`}
                control={control}
                render={({ field: measuredField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-howItsMeasured`} className={labelStyle}>
                      How It's Measured
                      {METRIC_FIELD_REQUIRED.howItsMeasured && <RequiredMark />}
                    </label>
                    <textarea
                      {...measuredField}
                      id={`${fieldKey}-${index}-howItsMeasured`}
                      rows={3}
                      placeholder="e.g., Count of unique wallet addresses interacting with the contract each month"
                      disabled={isLoading}
                      className={cn(
                        inputStyle,
                        "resize-none",
                        fieldState.error && "border-red-500 dark:border-red-500"
                      )}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-400 mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Target */}
              <Controller
                name={`${fieldKey}.${index}.target`}
                control={control}
                render={({ field: targetField, fieldState }) => (
                  <div>
                    <label htmlFor={`${fieldKey}-${index}-target`} className={labelStyle}>
                      Target
                      {METRIC_FIELD_REQUIRED.target && <RequiredMark />}
                    </label>
                    <input
                      {...targetField}
                      id={`${fieldKey}-${index}-target`}
                      type="text"
                      placeholder="e.g., 10,000 monthly active users by Q4"
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
            </div>
          </div>
        ))}
      </div>

      {canAddMore && !isLoading && (
        <Button
          type="button"
          onClick={handleAddMetric}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          + Add Metric
        </Button>
      )}

      {error && typeof error === "object" && "message" in error && (
        <p className="text-sm text-red-400 mt-1">{error.message as string}</p>
      )}

      {minMetrics > 0 && fields.length < minMetrics && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Please add at least {minMetrics} {pluralize("metric", minMetrics)}
        </p>
      )}
    </div>
  );
};
