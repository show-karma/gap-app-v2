"use client";

import { Trash2 } from "lucide-react";
import type { FC } from "react";
import { type Control, Controller, type FieldPath } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationFormData } from "../types";

interface MetricItemProps {
  index: number;
  namePrefix: string;
  control: Control<ApplicationFormData>;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}

// Each sub-field is registered independently so editing one never rewrites the
// others (avoids the stale-object-spread data loss).
export const MetricItem: FC<MetricItemProps> = ({
  index,
  namePrefix,
  control,
  onRemove,
  canRemove,
  disabled = false,
}) => {
  const subFieldName = (sub: string) =>
    `${namePrefix}.${index}.${sub}` as FieldPath<ApplicationFormData>;

  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4"
      data-testid={`metric-card-${index}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold" data-testid={`metric-title-${index}`}>
          Metric {index + 1}
        </h4>
        {canRemove && !disabled && (
          <Button
            type="button"
            onClick={onRemove}
            variant="ghost"
            size="icon-sm"
            data-testid={`remove-metric-btn-${index}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <Controller
        name={subFieldName("metric")}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={`metric-name-${index}`}>Metric *</Label>
            <Input
              id={`metric-name-${index}`}
              placeholder="e.g., Monthly active users"
              value={(field.value as string) || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              data-testid={`metric-name-input-${index}`}
            />
            {fieldState.error?.message && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        name={subFieldName("dataSource")}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={`metric-data-source-${index}`}>Data Source *</Label>
            <Input
              id={`metric-data-source-${index}`}
              placeholder="e.g., Dune Analytics dashboard"
              value={(field.value as string) || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              data-testid={`metric-data-source-input-${index}`}
            />
            {fieldState.error?.message && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        name={subFieldName("howItsMeasured")}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={`metric-how-measured-${index}`}>How It's Measured *</Label>
            <Textarea
              id={`metric-how-measured-${index}`}
              placeholder="e.g., Count of unique wallet addresses interacting with the contract each month"
              value={(field.value as string) || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              rows={3}
              data-testid={`metric-how-measured-input-${index}`}
            />
            {fieldState.error?.message && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        name={subFieldName("target")}
        control={control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={`metric-target-${index}`}>Target *</Label>
            <Input
              id={`metric-target-${index}`}
              placeholder="e.g., 10,000 monthly active users by Q4"
              value={(field.value as string) || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              data-testid={`metric-target-input-${index}`}
            />
            {fieldState.error?.message && (
              <p className="text-sm text-destructive">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />
    </div>
  );
};
