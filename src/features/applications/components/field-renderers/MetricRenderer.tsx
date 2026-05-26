"use client";

import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { MetricData } from "@/types/whitelabel-entities";
import { isMarkdownContent } from "../../lib/milestone-utils";

interface MetricRendererProps {
  label: string;
  value: MetricData[];
}

function DetailRow({ label, value }: { label: string; value: string }) {
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
            <DetailRow label="Target" value={metric.target} />
            <DetailRow label="Data Source" value={metric.dataSource} />
            <DetailRow label="How It's Measured" value={metric.howItsMeasured} />
          </div>
        ))}
      </div>
    </div>
  );
}
