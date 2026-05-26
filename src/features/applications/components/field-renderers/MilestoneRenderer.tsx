"use client";

import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { MetricData, MilestoneData } from "@/types/whitelabel-entities";
import { formatDate } from "@/utilities/formatDate";
import { isMarkdownContent } from "../../lib/milestone-utils";
import { MilestoneDisplay } from "../MilestoneDisplay";

interface MilestoneRendererProps {
  label: string;
  value: MilestoneData[];
  fieldLabel: string;
  referenceNumber: string;
}

export function MilestoneRenderer({
  label,
  value,
  fieldLabel,
  referenceNumber,
}: MilestoneRendererProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <MilestoneDisplay
        milestones={value}
        fieldLabel={fieldLabel}
        referenceNumber={referenceNumber}
      />
    </div>
  );
}

interface ObjectArrayRendererProps {
  label: string;
  value: Array<Record<string, unknown>>;
}

export function ObjectArrayRenderer({ label, value }: ObjectArrayRendererProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <div className="space-y-3 pl-4">
        {value.map((item, index) => {
          const title = item.title
            ? String(item.title)
            : item.name
              ? String(item.name)
              : `Item ${index + 1}`;
          const description = item.description ? String(item.description) : null;
          const date = item.date ? String(item.date) : null;
          const amount = item.amount ? String(item.amount) : null;

          return (
            <div
              key={`${label}-${index}`}
              className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 space-y-1"
            >
              <p className="font-medium text-sm">{title}</p>
              {description && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <MarkdownPreview source={description} />
                </div>
              )}
              {date && <p className="text-xs text-zinc-500">Due: {formatDate(date)}</p>}
              {amount && <p className="text-xs text-zinc-500">Amount: {amount}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleArrayRendererProps {
  label: string;
  value: Array<string | number>;
}

export function SimpleArrayRenderer({ label, value }: SimpleArrayRendererProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{value.join(", ")}</p>
    </div>
  );
}

interface MetricRendererProps {
  label: string;
  value: MetricData[];
}

function MetricDetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  if (isMarkdownContent(value)) {
    return (
      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
        <strong className="block mb-0.5">{label}:</strong>
        <MarkdownPreview source={value} />
      </div>
    );
  }
  return (
    <p className="text-xs text-zinc-700 dark:text-zinc-300">
      <strong>{label}:</strong> {value}
    </p>
  );
}

export function MetricRenderer({ label, value }: MetricRendererProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <div className="space-y-3 pl-4">
        {value.map((metric, index) => (
          <div
            key={`${label}-${index}`}
            className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 space-y-1"
          >
            <p className="font-medium text-sm">{metric.metric || `Metric ${index + 1}`}</p>
            <MetricDetailRow label="Target" value={metric.target} />
            <MetricDetailRow label="Data Source" value={metric.dataSource} />
            <MetricDetailRow label="How It's Measured" value={metric.howItsMeasured} />
          </div>
        ))}
      </div>
    </div>
  );
}
