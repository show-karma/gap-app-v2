"use client";

import type { FC, JSX } from "react";
import { useMemo } from "react";
import { KarmaProjectLink } from "@/components/FundingPlatform/shared/KarmaProjectLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { VideoPreview } from "@/src/features/judge-agent/components/video-preview";
import type {
  IFundingApplication,
  IMilestoneData,
  ProgramWithFormSchema,
} from "@/types/funding-platform";
import { createFieldLabelsMap, createFieldTypeMap } from "@/utilities/form-schema-helpers";
import { formatDate } from "@/utilities/formatDate";
import { PROJECT_UID_REGEX } from "@/utilities/validation";

const VIDEO_FIELD_PATTERNS = ["video", "demo", "youtube", "loom"];

function isVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") return true;
    if (url.hostname.includes("loom.com")) return true;
    if (/\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url.pathname)) return true;
  } catch {
    // not a valid URL
  }
  return false;
}

function isVideoField(fieldKey: string): boolean {
  const normalized = fieldKey.toLowerCase().replace(/[\s_-]+/g, "");
  return VIDEO_FIELD_PATTERNS.some((p) => normalized.includes(p));
}

export interface ApplicationDataViewProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
}

export const ApplicationDataView: FC<ApplicationDataViewProps> = ({ application, program }) => {
  // Resolve form schema from program object (handles both direct formSchema and nested applicationConfig.formSchema)
  const programAny = program as Record<string, unknown> | null | undefined;
  const formSchema =
    (programAny?.applicationConfig as Record<string, unknown> | undefined)?.formSchema ||
    programAny?.formSchema;

  // Create field labels and type mappings from program schema
  const fieldLabels = useMemo(() => createFieldLabelsMap(formSchema), [formSchema]);
  const fieldTypeMap = useMemo(() => createFieldTypeMap(formSchema), [formSchema]);

  const renderFieldValue = (value: any, fieldKey?: string): JSX.Element => {
    if (Array.isArray(value)) {
      // Check if it's an array of milestones
      const isMilestoneArray =
        value.length > 0 && typeof value[0] === "object" && "title" in value[0];

      if (isMilestoneArray) {
        return (
          <div className="space-y-3">
            {value.map((milestone: IMilestoneData, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {milestone.title}
                    </h5>
                    {milestone.dueDate && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0">
                        Due: {formatDate(new Date(milestone.dueDate))}
                      </span>
                    )}
                  </div>
                  {milestone.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownPreview source={milestone.description} />
                    </div>
                  )}
                  {milestone.fundingRequested && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Funding Requested:
                      </span>{" "}
                      <span className="text-gray-600 dark:text-gray-400">
                        {milestone.fundingRequested}
                      </span>
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
            ))}
          </div>
        );
      }

      // Regular array - render as tags
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-block bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm"
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
        <pre className="bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-lg text-sm overflow-x-auto border border-gray-200 dark:border-gray-600">
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

    // Video fields: render with video preview
    if (typeof value === "string" && fieldKey && isVideoField(fieldKey) && isVideoUrl(value)) {
      return (
        <div className="space-y-2">
          <div className="max-w-lg">
            <VideoPreview url={value} />
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {value}
          </a>
        </div>
      );
    }

    // Default: render as markdown
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownPreview source={String(value)} />
      </div>
    );
  };

  const dataToRender = application.applicationData;

  if (!dataToRender || Object.keys(dataToRender).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No application data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(dataToRender).map(([key, value]) => (
        <div
          key={key}
          className="border-b border-gray-100 dark:border-gray-700 pb-5 last:border-b-0"
        >
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {fieldLabels[key] || key.replace(/_/g, " ")}
          </dt>
          <dd className="text-base text-gray-900 dark:text-gray-100">
            {renderFieldValue(value, key)}
          </dd>
        </div>
      ))}
    </div>
  );
};

export default ApplicationDataView;
