"use client";

import { ArrowLeft, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  usePortfolioReport,
  usePublishReport,
  useRegenerateReport,
  useUnpublishReport,
  useUpdateReportMarkdown,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
  reportId: string;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function PortfolioReportEditorPage({ community, reportId }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: report, isLoading } = usePortfolioReport(slug, reportId);
  const updateMarkdownMutation = useUpdateReportMarkdown(slug);
  const publishMutation = usePublishReport(slug);
  const unpublishMutation = useUnpublishReport(slug);
  const regenerateMutation = useRegenerateReport(slug);

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Initialize local markdown from fetched report
  const currentMarkdown = markdown ?? report?.markdown ?? "";

  // Dirty flag: local edits differ from the saved value
  const isDirty = markdown !== null && markdown !== (report?.markdown ?? "");

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess || !report) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        {!hasAccess ? "You don't have permission to view this page." : "Report not found."}
      </div>
    );
  }

  const navigateBack = () => {
    router.push(PAGES.ADMIN.PORTFOLIO_REPORTS(slug));
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      navigateBack();
    }
  };

  const handleSave = async () => {
    try {
      await updateMarkdownMutation.mutateAsync({
        reportId,
        markdown: currentMarkdown,
      });
      // Sync dirty state away after successful save
      setMarkdown(null);
      toast.success("Report saved");
    } catch {
      toast.error("Failed to save report");
    }
  };

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(reportId);
      toast.success("Report published");
    } catch {
      toast.error("Failed to publish report");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishMutation.mutateAsync(reportId);
      toast.success("Report unpublished");
    } catch {
      toast.error("Failed to unpublish report");
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateMutation.mutateAsync(reportId);
      setMarkdown(result.markdown);
      toast.success("Report regenerated");
    } catch {
      toast.error("Failed to regenerate report");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Unsaved changes confirmation dialog */}
      <DeleteDialog
        title="You have unsaved changes. Leave without saving?"
        deleteFunction={async () => {
          navigateBack();
        }}
        isLoading={false}
        externalIsOpen={showUnsavedDialog}
        externalSetIsOpen={setShowUnsavedDialog}
        buttonElement={null}
      />

      {/* Regenerate confirmation dialog */}
      <DeleteDialog
        title="This will overwrite the current draft. Any edits will be lost. Continue?"
        deleteFunction={handleRegenerate}
        isLoading={regenerateMutation.isPending}
        externalIsOpen={showRegenerateDialog}
        externalSetIsOpen={setShowRegenerateDialog}
        buttonElement={null}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatMonth(report.reportMonth)}
              {isDirty && <span className="ml-2 text-sm font-normal text-zinc-400">(unsaved)</span>}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                  report.status === "published"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {report.status}
              </span>
              <span>Model: {report.modelId}</span>
              {report.tokenUsage && (
                <span>{report.tokenUsage.totalTokens.toLocaleString()} tokens</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {regenerateMutation.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={updateMarkdownMutation.isPending}
          >
            <Save className="mr-1 h-3 w-3" />
            {updateMarkdownMutation.isPending ? "Saving..." : "Save"}
          </Button>
          {report.status === "draft" ? (
            <Button size="sm" onClick={handlePublish} disabled={publishMutation.isPending}>
              <Eye className="mr-1 h-3 w-3" />
              Publish
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <MarkdownEditor
          value={currentMarkdown}
          onChange={(val) => setMarkdown(val)}
          maxLength={500000}
          height={700}
        />
      </div>
    </div>
  );
}
