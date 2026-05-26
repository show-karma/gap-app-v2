"use client";

import { Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MetricData } from "@/types/whitelabel-entities";

interface MetricItemProps {
  index: number;
  metric: MetricData;
  onUpdate: (data: MetricData) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
  errors?: {
    metric?: { message?: string };
    dataSource?: { message?: string };
    howItsMeasured?: { message?: string };
    target?: { message?: string };
  };
}

export const MetricItem: React.FC<MetricItemProps> = ({
  index,
  metric,
  onUpdate,
  onRemove,
  canRemove,
  disabled = false,
  errors,
}) => {
  const handleFieldChange = (field: keyof MetricData, value: string) => {
    onUpdate({
      ...metric,
      [field]: value,
    });
  };

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

      <div className="space-y-2">
        <Label htmlFor={`metric-name-${index}`}>Metric *</Label>
        <Input
          id={`metric-name-${index}`}
          placeholder="e.g., Monthly active users"
          value={metric.metric || ""}
          onChange={(e) => handleFieldChange("metric", e.target.value)}
          disabled={disabled}
          data-testid={`metric-name-input-${index}`}
        />
        {errors?.metric?.message && (
          <p className="text-sm text-destructive">{errors.metric.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`metric-data-source-${index}`}>Data Source *</Label>
        <Input
          id={`metric-data-source-${index}`}
          placeholder="e.g., Dune Analytics dashboard"
          value={metric.dataSource || ""}
          onChange={(e) => handleFieldChange("dataSource", e.target.value)}
          disabled={disabled}
          data-testid={`metric-data-source-input-${index}`}
        />
        {errors?.dataSource?.message && (
          <p className="text-sm text-destructive">{errors.dataSource.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`metric-how-measured-${index}`}>How It's Measured *</Label>
        <Textarea
          id={`metric-how-measured-${index}`}
          placeholder="e.g., Count of unique wallet addresses interacting with the contract each month"
          value={metric.howItsMeasured || ""}
          onChange={(e) => handleFieldChange("howItsMeasured", e.target.value)}
          disabled={disabled}
          rows={3}
          data-testid={`metric-how-measured-input-${index}`}
        />
        {errors?.howItsMeasured?.message && (
          <p className="text-sm text-destructive">{errors.howItsMeasured.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`metric-target-${index}`}>Target *</Label>
        <Input
          id={`metric-target-${index}`}
          placeholder="e.g., 10,000 monthly active users by Q4"
          value={metric.target || ""}
          onChange={(e) => handleFieldChange("target", e.target.value)}
          disabled={disabled}
          data-testid={`metric-target-input-${index}`}
        />
        {errors?.target?.message && (
          <p className="text-sm text-destructive">{errors.target.message}</p>
        )}
      </div>
    </div>
  );
};
