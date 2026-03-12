"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getProjectTitle } from "@/src/features/applications/lib/getProjectTitle";
import type { Application } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";

interface ApplicationsTableProps {
  applications: Application[];
  isLoading: boolean;
  selectedApplicationId: string | null;
  onSelectApplication: (app: Application) => void;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

function findFieldValue(data: Record<string, unknown>, patterns: string[]): string | undefined {
  for (const [key, value] of Object.entries(data)) {
    const nk = normalizeKey(key);
    if (patterns.some((p) => nk.includes(p)) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function extractApplicationFields(app: Application) {
  const data = app.applicationData || {};
  return {
    projectName: getProjectTitle(app),
    videoUrl: findFieldValue(data, ["video", "demo", "youtube", "loom"]),
    repoUrl: findFieldValue(data, ["github", "repo", "repository", "sourcecode"]),
    deckUrl: findFieldValue(data, ["deck", "pitch", "slides", "presentation"]),
    karmaProfile: findFieldValue(data, ["karma", "gap", "profile"]),
  };
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-muted text-muted-foreground";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", style)}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ApplicationsTableComponent({
  applications,
  isLoading,
  selectedApplicationId,
  onSelectApplication,
}: ApplicationsTableProps) {
  const rows = useMemo(
    () =>
      applications.map((app) => ({
        app,
        ...extractApplicationFields(app),
      })),
    [applications]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">No applications found for this program.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Applications ({applications.length})
        </h3>
        <Button variant="outline" size="sm" disabled>
          Bulk Judge
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Project
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Video
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Repo
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Submitted
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, projectName, videoUrl, repoUrl }) => {
              const isSelected = selectedApplicationId === app.id;
              return (
                <tr
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className={cn(
                    "cursor-pointer border-b border-border last:border-b-0 transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <td className="px-4 py-3">
                    <p
                      className={cn(
                        "font-medium truncate max-w-[200px]",
                        isSelected && "text-primary"
                      )}
                    >
                      {projectName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {app.referenceNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3">
                    {videoUrl ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {repoUrl ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const ApplicationsTable = React.memo(ApplicationsTableComponent);
