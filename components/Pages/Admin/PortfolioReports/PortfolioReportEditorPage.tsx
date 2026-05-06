"use client";

import { ArrowLeft, Download, Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  usePortfolioReport,
  usePublishReport,
  useRegenerateReport,
  useUnpublishReport,
  useUpdateReportContent,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import { downloadReportPdf } from "@/services/portfolio-reports.service";
import { isReportGenerating } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { GenerationStatusBadge } from "./GenerationStatusBadge";

interface Props {
  community: Community;
  reportId: string;
}

/**
 * Admin preview + actions page.
 *
 * Edit affordance is intentionally a raw HTML textarea. The rendered
 * output is structured HTML (produced by the BE renderer from the
 * agentic structured document); a WYSIWYG would either lose round-trip
 * fidelity or require rebuilding the renderer in the browser. The
 * textarea is enough for typo-fix-shaped edits, and Regenerate is the
 * right move for anything larger.
 */
export function PortfolioReportEditorPage({ community, reportId }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: report, isLoading } = usePortfolioReport(slug, reportId);
  const publishMutation = usePublishReport(slug);
  const unpublishMutation = useUnpublishReport(slug);
  const regenerateMutation = useRegenerateReport(slug);
  const updateContentMutation = useUpdateReportContent(slug);

  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (showEditDialog && report?.content) {
      setEditDraft(report.content);
    }
  }, [showEditDialog, report?.content]);

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

  const generating = isReportGenerating(report);
  const failed = report.status === "failed";

  const navigateBack = () => {
    router.push(PAGES.ADMIN.PORTFOLIO_REPORTS(slug));
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
      await regenerateMutation.mutateAsync(reportId);
      setShowRegenerateDialog(false);
      toast.success("Regeneration started");
    } catch {
      toast.error("Failed to start regeneration");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateContentMutation.mutateAsync({ reportId, content: editDraft });
      setShowEditDialog(false);
      toast.success("Report content saved");
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await downloadReportPdf(slug, reportId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `portfolio-report-${report.runDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Failed to export PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setExportingPdf(false);
    }
  };

  const runDateLabel = formatRunDate(report.runDate).label;

  return (
    <div className="flex h-full flex-col">
      <DeleteDialog
        title="This re-runs the agentic generator with the current config and overwrites the existing content. Spends LLM tokens. Continue?"
        deleteFunction={handleRegenerate}
        isLoading={regenerateMutation.isPending}
        externalIsOpen={showRegenerateDialog}
        externalSetIsOpen={setShowRegenerateDialog}
        buttonElement={null}
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit report content</DialogTitle>
            <DialogDescription>
              Edits the rendered HTML directly. Regenerating the report will overwrite these
              changes.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="h-[60vh] w-full resize-none rounded border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            spellCheck={false}
            aria-label="Report HTML content"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={updateContentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateContentMutation.isPending || editDraft === (report.content ?? "")}
            >
              {updateContentMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateBack}
            aria-label="Back to portfolio reports"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {runDateLabel}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <GenerationStatusBadge status={report.status} />
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
            onClick={() => setShowEditDialog(true)}
            disabled={generating || !report.content}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf || generating || !report.content}
          >
            <Download className="mr-1 h-3 w-3" />
            {exportingPdf ? "Exporting…" : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={regenerateMutation.isPending || generating}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {regenerateMutation.isPending
              ? "Starting…"
              : generating
                ? "Generating…"
                : failed
                  ? "Retry"
                  : "Regenerate"}
          </Button>
          {report.status === "draft" ? (
            <Button size="sm" onClick={handlePublish} disabled={publishMutation.isPending}>
              <Eye className="mr-1 h-3 w-3" />
              Publish
            </Button>
          ) : report.status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Unpublish
            </Button>
          ) : null}
        </div>
      </div>

      {generating ? (
        <output className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
          <Spinner className="h-4 w-4" />
          <span>
            Generation in progress. This page will refresh automatically when the report is ready.
          </span>
        </output>
      ) : null}

      {failed && report.generationError ? (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          <p className="font-medium">Generation failed</p>
          <p className="text-xs opacity-90">{report.generationError}</p>
        </div>
      ) : null}

      {/* Preview */}
      <div className="flex-1 p-4">
        {report.content ? (
          <HtmlReportFrame html={report.content} title={`Portfolio report — ${runDateLabel}`} />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            No content yet. Regenerate to produce the report body.
          </div>
        )}
      </div>
    </div>
  );
}
