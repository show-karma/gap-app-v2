"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { type FC, type JSX, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useApplicationVersions } from "@/hooks/useFundingPlatform";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import type { IFundingApplication, ProgramWithFormSchema, IFundingProgramConfig } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { getProjectTitle } from "../helper/getProjecTitle";
import { AIEvaluationDisplay } from "./AIEvaluation";
import AIEvaluationButton from "./AIEvaluationButton";
import ApplicationVersionSelector from "./ApplicationVersionSelector";
import ApplicationVersionViewer from "./ApplicationVersionViewer";
import { InternalAIEvaluationDisplay } from "./InternalAIEvaluation";
import PostApprovalData from "./PostApprovalData";
import { StatusActionButtons } from "./StatusActionButtons";
import StatusChangeModal from "./StatusChangeModal";

interface ApplicationContentProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  showStatusActions?: boolean;
  showAIEvaluationButton?: boolean;
  showInternalEvaluation?: boolean;
  onStatusChange?: (status: string, note?: string) => Promise<void>;
  viewMode?: "details" | "changes";
  onViewModeChange?: (mode: "details" | "changes") => void;
  onRefresh?: () => void;
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  under_review: "bg-purple-100 text-purple-800 border-purple-200",
  revision_requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons = {
  pending: ClockIcon,
  under_review: ClockIcon,
  revision_requested: ExclamationTriangleIcon,
  approved: CheckCircleIcon,
  rejected: XMarkIcon,
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ApplicationContent: FC<ApplicationContentProps> = ({
  application,
  program,
  showStatusActions = false,
  showAIEvaluationButton = false,
  showInternalEvaluation,
  onStatusChange,
  viewMode: controlledViewMode,
  onViewModeChange,
  onRefresh,
}) => {
  // Resolve form schema from program object (handling both FundingProgram and IFundingProgramConfig structures)
  const formSchema = (program as any)?.applicationConfig?.formSchema || program?.formSchema;

  // Show internal evaluation section if user has access (don't require config check)
  const shouldShowInternalEvaluation = showInternalEvaluation ?? showAIEvaluationButton;

  // Check if internal evaluation is configured (for button functionality)
  const canRunInternalEvaluation = Boolean(formSchema?.aiConfig?.internalLangfusePromptId);
  const showMissingInternalPromptWarning = showAIEvaluationButton && !canRunInternalEvaluation;
  const internalPromptHelpText =
    "Configure the internal Langfuse prompt under the program's AI Evaluation settings to enable manual runs.";
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [internalViewMode, setInternalViewMode] = useState<"details" | "changes">("details");

  // Use controlled mode if provided, otherwise use internal state
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Get UI state from Zustand store
  const { selectedVersion } = useApplicationVersionsStore();

  // Get application identifier for fetching versions
  const applicationIdentifier = application?.referenceNumber || application?.id;

  // Fetch versions using React Query
  const { versions } = useApplicationVersions(applicationIdentifier);

  // Auto-select the latest version when versions are loaded
  const { selectVersion } = useApplicationVersionsStore();
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      selectVersion(versions[0].id, versions);
    }
  }, [versions, selectedVersion, selectVersion]);

  // Create field labels mapping from program schema
  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (formSchema?.fields) {
      formSchema.fields.forEach((field: any) => {
        if (field.id && field.label) {
          labels[field.id] = field.label;
        }
      });
    }
    return labels;
  }, [formSchema]);

  const StatusIcon = statusIcons[application.status as keyof typeof statusIcons] || ClockIcon;

  const handleStatusChangeClick = (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusModalOpen(true);
  };

  const handleStatusChangeConfirm = async (reason?: string) => {
    if (onStatusChange && pendingStatus) {
      try {
        setIsUpdatingStatus(true);
        await onStatusChange(pendingStatus, reason);
        setStatusModalOpen(false);
        setPendingStatus("");
        toast.success(`Application status updated to ${formatStatus(pendingStatus)}`);
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error("Failed to update application status");
      } finally {
        setIsUpdatingStatus(false);
      }
    }
  };

  const handleAIEvaluationComplete = async (): Promise<void> => {
    // Refresh the application data to show the updated AI evaluation
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Failed to refresh application data after AI evaluation:", error);
        toast.error(
          "Evaluation completed but failed to refresh the display. Please reload the page."
        );
      }
    }
  };

  const getCurrentRevisionReason = (): string | null => {
    if (application.status === "revision_requested" && application.statusHistory) {
      const revisionEntry = application.statusHistory
        .filter((h) => h.status === "revision_requested")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return revisionEntry?.reason || null;
    }
    return null;
  };

  const renderFieldValue = (value: any): JSX.Element => {
    if (Array.isArray(value)) {
      // Check if it's an array of milestones
      const isMilestoneArray =
        value.length > 0 && typeof value[0] === "object" && "title" in value[0];

      if (isMilestoneArray) {
        // Core fields that have special rendering
        const coreFields = ["title", "description", "dueDate"];

        // Helper to convert camelCase to Title Case
        const formatFieldLabel = (key: string): string => {
          return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
        };

        // Helper to check if a value looks like markdown (multi-line or has markdown syntax)
        const isMarkdownContent = (val: string): boolean => {
          return (
            val.includes("\n") ||
            val.includes("**") ||
            val.includes("##") ||
            val.includes("- ") ||
            val.includes("* ") ||
            val.includes("`") ||
            val.length > 100
          );
        };

        return (
          <div className="space-y-2">
            {value.map((milestone: any, index) => {
              // Get additional fields (excluding core fields)
              const additionalFields = Object.keys(milestone).filter(
                (key) => !coreFields.includes(key) && milestone[key]
              );

              return (
                <div
                  key={index}
                  className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-2">
                    {/* Title and Due Date - Core fields with special rendering */}
                    <div className="flex justify-between items-start">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {milestone.title}
                      </h5>
                      {milestone.dueDate && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          Due: {formatDate(new Date(milestone.dueDate))}
                        </span>
                      )}
                    </div>

                    {/* Description - Core field with markdown */}
                    {milestone.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-xs dark:prose-invert max-w-none">
                        <MarkdownPreview source={milestone.description} />
                      </div>
                    )}

                    {/* Dynamic additional fields */}
                    {additionalFields.map((fieldKey) => {
                      const fieldValue = milestone[fieldKey];
                      const label = formatFieldLabel(fieldKey);

                      // Skip empty values
                      if (!fieldValue) return null;

                      // Check if content looks like markdown
                      const shouldRenderAsMarkdown =
                        typeof fieldValue === "string" && isMarkdownContent(fieldValue);

                      return (
                        <div key={fieldKey} className="text-xs">
                          {shouldRenderAsMarkdown ? (
                            <>
                              <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {label}:
                              </div>
                              <div className="text-gray-600 dark:text-gray-400 prose prose-xs dark:prose-invert max-w-none">
                                <MarkdownPreview source={String(fieldValue)} />
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {label}:{" "}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {String(fieldValue)}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      // Regular array - render as tags
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-block bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return <span>{value ? "Yes" : "No"}</span>;
    }

    if (typeof value === "object" && value !== null) {
      return (
        <pre className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    // Default: render as markdown
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownPreview source={String(value)} />
      </div>
    );
  };

  const renderApplicationData = (): JSX.Element => {
    const dataToRender = application.applicationData;

    if (!dataToRender || Object.keys(dataToRender).length === 0) {
      return <p className="text-gray-500 dark:text-gray-400">No application data available</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(dataToRender).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {fieldLabels[key] || key.replace(/_/g, " ")}
            </dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100">{renderFieldValue(value)}</dd>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Application Header Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col flex-wrap items-start justify-between mb-4 gap-1">
            <div
              className={cn(
                "flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium",
                statusColors[application.status as keyof typeof statusColors] ||
                  "bg-zinc-100 text-gray-800 border-gray-200"
              )}
            >
              <StatusIcon className="w-4 h-4" />
              <span>{formatStatus(application.status)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {getProjectTitle(application)}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {application.applicantEmail}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Submitted</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(application.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(application.updatedAt)}
              </dd>
            </div>
          </dl>

          {/* Status Actions */}
          {!["approved", "rejected"].includes(application.status) &&
            showStatusActions &&
            onStatusChange && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <StatusActionButtons
                  currentStatus={application.status as any}
                  onStatusChange={handleStatusChangeClick}
                  isUpdating={isUpdatingStatus}
                />
              </div>
            )}
        </div>

        {/* Current Revision Reason */}
        {getCurrentRevisionReason() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              Revision Requested
            </h3>
            <div className="text-sm text-yellow-800 dark:text-yellow-400 prose prose-sm dark:prose-invert max-w-none">
              <MarkdownPreview source={getCurrentRevisionReason() || ""} />
            </div>
          </div>
        )}

        {application?.postApprovalData && Object.keys(application?.postApprovalData).length > 0 && (
          <PostApprovalData postApprovalData={application?.postApprovalData} program={program} />
        )}

        {/* Application Data Section with Toggle */}
        <div
          id="application-details"
          className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          {/* Toggle Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Application Details
            </h3>
            {versions.length > 0 && (
              <div className="flex items-center bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("details")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === "details"
                      ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  Details
                </button>
                <button
                  onClick={() => setViewMode("changes")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === "changes"
                      ? "bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Changes
                </button>
              </div>
            )}
          </div>

          {/* Content based on view mode */}
          {viewMode === "details" ? (
            /* Details Mode - Show full application data */
            <div>{renderApplicationData()}</div>
          ) : (
            /* Changes Mode - Show version selector and changed fields */
            <div>
              <ApplicationVersionSelector
                applicationId={application.referenceNumber || application.id}
                formSchema={formSchema}
              />
              {selectedVersion && (
                <div className="mt-6">
                  <ApplicationVersionViewer version={selectedVersion} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Evaluation */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Evaluation</h3>
            {showAIEvaluationButton && (
              <AIEvaluationButton
                referenceNumber={application.referenceNumber}
                onEvaluationComplete={handleAIEvaluationComplete}
                disabled={isUpdatingStatus}
              />
            )}
          </div>
          <AIEvaluationDisplay
            evaluation={application.aiEvaluation?.evaluation || null}
            isLoading={false}
            isEnabled={true}
            hasError={false}
            programName={program?.name || ""}
          />
        </div>

        {/* Internal AI Evaluation */}
        {shouldShowInternalEvaluation && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Internal AI Evaluation
              </h3>
              {showAIEvaluationButton && (
                <div
                  className="flex-shrink-0"
                  title={!canRunInternalEvaluation ? internalPromptHelpText : undefined}
                >
                  <AIEvaluationButton
                    referenceNumber={application.referenceNumber}
                    onEvaluationComplete={handleAIEvaluationComplete}
                    disabled={isUpdatingStatus || !canRunInternalEvaluation}
                    isInternal={true}
                  />
                </div>
              )}
            </div>

            {showMissingInternalPromptWarning && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-200">
                    Internal prompt not configured
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200/80 text-xs leading-relaxed">
                    Set the{" "}
                    <span className="font-semibold">Internal AI Evaluation Prompt Name</span> in the
                    program&apos;s AI configuration (Form Builder → AI Evaluation Configuration) to
                    enable manual internal runs.
                  </p>
                </div>
              </div>
            )}

            <InternalAIEvaluationDisplay
              evaluation={application.internalAIEvaluation?.evaluation || null}
              programName={program?.name || ""}
            />
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setPendingStatus("");
        }}
        onConfirm={handleStatusChangeConfirm}
        status={pendingStatus}
        isSubmitting={isUpdatingStatus}
        isReasonRequired={pendingStatus === "revision_requested"}
        programConfig={program as IFundingProgramConfig | undefined}
      />
    </>
  );
};

export default ApplicationContent;
