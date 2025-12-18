"use client";

import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { type FC, useEffect, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { useApplicationVersions } from "@/hooks/useFundingPlatform";
import { useApplicationVersionsStore } from "@/store/applicationVersions";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";
import ApplicationVersionSelector from "../ApplicationVersionSelector";
import ApplicationVersionViewer from "../ApplicationVersionViewer";
import { ApplicationDataView } from "./ApplicationDataView";
import { ApplicationSubTabs, type SubTabId } from "./ApplicationSubTabs";
import { PostApprovalDataView } from "./PostApprovalDataView";

export interface ApplicationTabProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  /** Controlled view mode */
  viewMode?: "details" | "changes";
  /** Callback when view mode changes */
  onViewModeChange?: (mode: "details" | "changes") => void;
}

export const ApplicationTab: FC<ApplicationTabProps> = ({
  application,
  program,
  viewMode: controlledViewMode,
  onViewModeChange,
}) => {
  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("application");

  // View mode state (internal if not controlled)
  const [internalViewMode, setInternalViewMode] = useState<"details" | "changes">("details");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Version state from Zustand store
  const { selectedVersion, selectVersion } = useApplicationVersionsStore();

  // Fetch versions
  const applicationIdentifier = application?.referenceNumber || application?.id;
  const { versions } = useApplicationVersions(applicationIdentifier);

  // Auto-select the latest version when versions are loaded
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      selectVersion(versions[0].id, versions);
    }
  }, [versions, selectedVersion, selectVersion]);

  // Check if post-approval data exists and application is approved
  const showPostApproval =
    application.status === "approved" &&
    application.postApprovalData &&
    Object.keys(application.postApprovalData).length > 0;

  // Get current revision reason if status is revision_requested
  const getCurrentRevisionReason = (): string | null => {
    if (application.status === "revision_requested" && application.statusHistory) {
      const revisionEntry = application.statusHistory
        .filter((h) => h.status === "revision_requested")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return revisionEntry?.reason || null;
    }
    return null;
  };

  const revisionReason = getCurrentRevisionReason();

  return (
    <div className="space-y-6">
      {/* Revision Reason Banner */}
      {revisionReason && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
            Revision Requested
          </h3>
          <div className="text-sm text-yellow-800 dark:text-yellow-400 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview source={revisionReason} />
          </div>
        </div>
      )}

      {/* Header: Sub-tabs (only if Post Approval exists) + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Sub-tabs (Application / Post Approval) - only show when there's more than one tab */}
        {showPostApproval && (
          <ApplicationSubTabs
            activeTab={activeSubTab}
            onTabChange={setActiveSubTab}
            showPostApproval={true}
          />
        )}

        {/* Details/Changes Toggle - only show for Application sub-tab when versions exist */}
        {activeSubTab === "application" && versions.length > 0 && (
          <div className="flex items-center bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
            <button
              type="button"
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
              type="button"
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

      {/* Content based on active sub-tab and view mode */}
      <div id="application-details">
        {activeSubTab === "application" ? (
          viewMode === "details" ? (
            <ApplicationDataView application={application} program={program} />
          ) : (
            <div className="space-y-6">
              <ApplicationVersionSelector
                applicationId={application.referenceNumber || application.id}
              />
              {selectedVersion && (
                <div className="mt-6">
                  <ApplicationVersionViewer version={selectedVersion} />
                </div>
              )}
            </div>
          )
        ) : (
          <PostApprovalDataView application={application} program={program} />
        )}
      </div>
    </div>
  );
};

export default ApplicationTab;
