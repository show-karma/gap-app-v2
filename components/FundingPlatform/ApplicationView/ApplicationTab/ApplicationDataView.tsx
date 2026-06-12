"use client";

import type { FC, JSX } from "react";
import { useMemo } from "react";
import { KarmaProjectLink } from "@/components/FundingPlatform/shared/KarmaProjectLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { MilestoneStatusBadge } from "@/src/features/applications/components/MilestoneStatusBadge";
import {
  buildMilestoneStatusIndex,
  lookupMilestoneStatus,
} from "@/src/features/applications/lib/milestone-status";
import type {
  IFundingApplication,
  IMetricData,
  IMilestoneData,
  ProgramWithFormSchema,
} from "@/types/funding-platform";
import { createFieldLabelsMap, createFieldTypeMap } from "@/utilities/form-schema-helpers";
import { formatDate } from "@/utilities/formatDate";
import { formatMilestoneAmount } from "@/utilities/formatMilestoneAmount";
import { PROJECT_UID_REGEX } from "@/utilities/validation";

interface ApplicationDataViewProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  excludeMilestones?: boolean;
}

export const ApplicationDataView: FC<ApplicationDataViewProps> = ({
  application,
  program,
  excludeMilestones,
}) => {
  // Resolve form schema from program object (handles both direct formSchema and nested applicationConfig.formSchema)
  const programAny = program as Record<string, unknown> | null | undefined;
  const formSchema =
    (programAny?.applicationConfig as Record<string, unknown> | undefined)?.formSchema ||
    programAny?.formSchema;

  // Create field labels and type mappings from program schema
  const fieldLabels = useMemo(() => createFieldLabelsMap(formSchema), [formSchema]);
  const fieldTypeMap = useMemo(() => createFieldTypeMap(formSchema), [formSchema]);

  const statusByKey = useMemo(
    () => buildMilestoneStatusIndex(application.milestoneStatuses),
    [application.milestoneStatuses]
  );

  const renderFieldValue = (value: unknown, fieldKey?: string): JSX.Element => {
    if (Array.isArray(value)) {
      // Check if it's an array of milestones
      const isMilestoneArray =
        value.length > 0 && typeof value[0] === "object" && "title" in value[0];

      // Check if it's an array of metrics
      const isMetricArray =
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        "metric" in value[0] &&
        "target" in value[0];

      if (isMetricArray) {
        return (
          <div className="space-y-3">
            {value.map((metric: IMetricData, index) => (
              <div
                key={`${metric.metric}-${metric.target}`}
                className="rounded-xl border border-border bg-muted/40 p-4"
              >
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                    {metric.metric || `Metric ${index + 1}`}
                  </h5>
                  {metric.target && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Target:</span> {metric.target}
                    </p>
                  )}
                  {metric.dataSource && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Data Source:</span> {metric.dataSource}
                    </p>
                  )}
                  {metric.howItsMeasured && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        How It's Measured:
                      </span>{" "}
                      {metric.howItsMeasured}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (isMilestoneArray) {
        return (
          <div className="space-y-3">
            {value.map((milestone: IMilestoneData) => {
              const status = lookupMilestoneStatus(
                statusByKey,
                milestone.milestoneUID,
                fieldKey,
                milestone.title
              );
              return (
                <div
                  key={milestone.milestoneUID || milestone.title}
                  className="rounded-xl border border-border bg-muted/40 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                          {milestone.title}
                        </h5>
                        <MilestoneStatusBadge entry={status} />
                        {formatMilestoneAmount(milestone.fundingRequested) && (
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {formatMilestoneAmount(milestone.fundingRequested)}
                          </span>
                        )}
                      </div>
                      {milestone.dueDate && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0">
                          Due: {formatDate(milestone.dueDate)}
                        </span>
                      )}
                    </div>
                    {milestone.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownPreview source={milestone.description} />
                      </div>
                    )}
                    {milestone.completionCriteria && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Completion Criteria:
                        </span>
                        <div className="text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none mt-1">
                          <MarkdownPreview source={milestone.completionCriteria} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      // Regular array - render as tags
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={String(item)}
              className="inline-block rounded-full bg-muted px-3 py-1 text-sm text-foreground"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <span
          className={
            value ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
          }
        >
          {value ? "Yes" : "No"}
        </span>
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-sm">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    // Handle Karma profile link fields (use field type from schema)
    const fieldType = fieldKey ? fieldTypeMap[fieldKey] : undefined;
    if (
      fieldType === "karma_profile_link" &&
      typeof value === "string" &&
      PROJECT_UID_REGEX.test(value)
    ) {
      return <KarmaProjectLink uid={value} />;
    }

    // Default: render as markdown
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownPreview source={String(value)} />
      </div>
    );
  };

  const { applicationData } = application;
  const dataToRender = useMemo(() => {
    if (!excludeMilestones || !applicationData) return applicationData;
    return Object.fromEntries(
      Object.entries(applicationData).filter(([_, value]) => {
        if (!Array.isArray(value) || value.length === 0) return true;
        return !(typeof value[0] === "object" && value[0] !== null && "title" in value[0]);
      })
    );
  }, [applicationData, excludeMilestones]);

  if (!dataToRender || Object.keys(dataToRender).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No application data available</p>
      </div>
    );
  }

  return (
    <dl className="divide-y divide-border">
      {Object.entries(dataToRender).map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-6"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {fieldLabels[key] || key.replace(/_/g, " ")}
          </dt>
          <dd className="text-[15px] leading-relaxed text-foreground">
            {renderFieldValue(value, key)}
          </dd>
        </div>
      ))}
    </dl>
  );
};
