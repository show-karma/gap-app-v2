"use client";

import type { FC, JSX } from "react";
import { useMemo } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useProject } from "@/hooks/useProject";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { envVars } from "@/utilities/enviromentVars";
import { formatDate } from "@/utilities/formatDate";

// Sub-component for displaying karma_profile_link with project name
const KarmaProjectLink: FC<{ uid: string }> = ({ uid }) => {
  const { project, isLoading } = useProject(uid);

  if (isLoading) {
    return <span className="text-gray-500 animate-pulse">Loading project...</span>;
  }

  const displayName = project?.details?.title || `${uid.slice(0, 10)}...`;

  return (
    <a
      href={`${envVars.KARMA_BASE_URL}/project/${uid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
    >
      {displayName}
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
};

export interface ApplicationDataViewProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
}

export const ApplicationDataView: FC<ApplicationDataViewProps> = ({ application, program }) => {
  // Resolve form schema from program object
  const formSchema = (program as any)?.applicationConfig?.formSchema || program?.formSchema;

  // Create field labels mapping from program schema
  const fieldLabels: Record<string, string> = {};
  if (formSchema?.fields) {
    formSchema.fields.forEach((field: any) => {
      if (field.id && field.label) {
        fieldLabels[field.id] = field.label;
      }
    });
  }

  // Create field type mapping from program schema (maps field.id and field.label -> field.type)
  const fieldTypeMap = useMemo(() => {
    const types: Record<string, string> = {};
    if (formSchema?.fields) {
      formSchema.fields.forEach((field: any) => {
        if (field.id && field.type) {
          types[field.id] = field.type;
        }
        if (field.label && field.type) {
          types[field.label] = field.type;
        }
      });
    }
    console.log("[ApplicationDataView] fieldTypeMap created:", {
      schemaFieldCount: formSchema?.fields?.length ?? 0,
      mappedKeys: Object.keys(types),
      types,
      schemaFields: formSchema?.fields?.map((f: any) => ({
        id: f.id,
        label: f.label,
        type: f.type,
      })),
    });
    return types;
  }, [formSchema]);

  const renderFieldValue = (value: any, fieldKey?: string): JSX.Element => {
    if (Array.isArray(value)) {
      // Check if it's an array of milestones
      const isMilestoneArray =
        value.length > 0 && typeof value[0] === "object" && "title" in value[0];

      if (isMilestoneArray) {
        return (
          <div className="space-y-3">
            {value.map((milestone: any, index) => (
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
    console.log("[ApplicationDataView] Field type lookup:", {
      fieldKey,
      fieldType,
      valueType: typeof value,
      isKarmaProfileLink: fieldType === "karma_profile_link",
      valuePreview: typeof value === "string" ? value.slice(0, 20) : value,
    });
    if (
      fieldType === "karma_profile_link" &&
      typeof value === "string" &&
      /^0x[a-fA-F0-9]{64}$/.test(value)
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

  const dataToRender = application.applicationData;

  if (!dataToRender || Object.keys(dataToRender).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No application data available</p>
      </div>
    );
  }

  console.log("[ApplicationDataView] Rendering application data:", {
    applicationDataKeys: Object.keys(dataToRender || {}),
    fieldTypeMapKeys: Object.keys(fieldTypeMap),
  });

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
