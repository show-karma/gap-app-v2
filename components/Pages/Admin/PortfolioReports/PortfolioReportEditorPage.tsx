"use client";

import { ArrowLeft, Download, Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { ReportChartsSection } from "@/components/Pages/Community/PortfolioReports/ReportChartsSection";
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
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { communityAdminDenial } from "@/src/components/ui/access-denied-presets";
import { isReportGenerating } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { GenerationStatusBadge } from "./GenerationStatusBadge";

interface Props {
  community: Community;
  reportId: string;
}

const TITLE_INPUT_ID = "portfolio-report-title";
/** Mirrors `UpdateReportContentBodySchema.title` max on the indexer. */
const TITLE_MAX_LENGTH = 200;

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
  const { push: routerPush } = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: report, isLoading } = usePortfolioReport(slug, reportId);
  const publishMutation = usePublishReport(slug);
  const unpublishMutation = useUnpublishReport(slug);
  const regenerateMutation = useRegenerateReport(slug);
  const updateContentMutation = useUpdateReportContent(slug);

  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  // Edit-dialog state lives in one object so we can update {open, draft}
  // atomically in event handlers. Avoids a chain of setState updates
  // across useState + useEffect.
  const [editState, setEditState] = useState<{
    open: boolean;
    draft: string;
    titleDraft: string;
  }>({
    open: false,
    draft: "",
    titleDraft: "",
  });

  const isReportRegenerating = report ? isReportGenerating(report) : false;
  // Edit dialog hides automatically while a regenerate is in flight — the
  // visual openness is derived, no useEffect to "react" to status changes.
  // The toast + draft-clear for the local-regen case is handled inside
  // handleRegenerate; for the rare remote-triggered regen, the dialog
  // just visually closes without a toast (acceptable since it's rare).
  const isEditDialogVisible = editState.open && !isReportRegenerating;

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        {...communityAdminDenial(community.details?.name)}
        communitySlug={community.details?.slug || community.uid}
        communityName={community.details?.name}
      />
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">Report not found.</div>
    );
  }

  const generating = isReportGenerating(report);
  const failed = report.status === "failed";

  const navigateBack = () => {
    routerPush(PAGES.ADMIN.PORTFOLIO_REPORTS(slug));
  };

  const openEditDialog = () => {
    setEditState({
      open: true,
      draft: report.content ?? "",
      titleDraft: report.title ?? "",
    });
  };

  const closeEditDialog = () => {
    setEditState((prev) => ({ ...prev, open: false }));
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
      // If the user had Edit open, close it and clear the draft — saving
      // post-regen would clobber the freshly generated content, and a
      // stale draft would surface a misleading "unsaved edits" warning
      // on the next Regenerate click.
      if (editState.open) {
        setEditState({ open: false, draft: "", titleDraft: "" });
        toast("Closed Edit — report is regenerating. Reopen when it finishes.", {
          icon: "ℹ️",
        });
      }
      toast.success("Regeneration started");
    } catch {
      toast.error("Failed to start regeneration");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateContentMutation.mutateAsync({
        reportId,
        content: editState.draft,
        // An emptied field clears the title (null) rather than sending "",
        // which the API rejects. Null restores the config-name fallback.
        title: editState.titleDraft.trim() || null,
      });
      // Atomically close + clear so the brief window before React Query's
      // cache update propagates doesn't make `hasUnsavedEdits` falsely true.
      setEditState({ open: false, draft: "", titleDraft: "" });
      toast.success("Report saved");
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const runDateLabel = formatRunDate(report.runDate).label;

  // True when the user has typed in the Edit dialog and their local draft
  // diverges from the server's saved state. We only warn about *user* edits,
  // not the initial empty state before the dialog has ever been opened.
  const hasContentEdits = editState.draft !== "" && editState.draft !== (report.content ?? "");
  const hasTitleEdits = editState.open && editState.titleDraft.trim() !== (report.title ?? "");
  const hasUnsavedEdits = hasContentEdits || hasTitleEdits;

  return (
    <div className="flex h-full flex-col">
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasUnsavedEdits ? "Discard unsaved edits and regenerate?" : "Regenerate report?"}
            </DialogTitle>
            <DialogDescription>
              {hasUnsavedEdits
                ? "You have unsaved changes in the editor. Regenerating will overwrite the report content and your unsaved edits will be lost. To keep a copy, cancel and export PDF first."
                : "This re-runs the agentic generator with the current config and overwrites the existing content. Spends LLM tokens."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
              disabled={regenerateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending
                ? "Starting…"
                : hasUnsavedEdits
                  ? "Discard & regenerate"
                  : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogVisible}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit report</DialogTitle>
            <DialogDescription>
              Edits the rendered HTML directly. Regenerating the report will overwrite the content,
              but keeps the title.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={TITLE_INPUT_ID}
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title
            </label>
            <input
              id={TITLE_INPUT_ID}
              type="text"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={editState.titleDraft}
              onChange={(event) =>
                setEditState((prev) => ({ ...prev, titleDraft: event.target.value }))
              }
              maxLength={TITLE_MAX_LENGTH}
              placeholder={report.reportConfigName ?? "e.g. Monthly Pods Report — June 2026"}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Name the period this report covers — it&apos;s what readers see in the public list.
              Leave empty to fall back to the report config&apos;s name.
            </p>
          </div>
          <textarea
            className="h-[50vh] w-full resize-none rounded border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={editState.draft}
            onChange={(event) => setEditState((prev) => ({ ...prev, draft: event.target.value }))}
            spellCheck={false}
            aria-label="Report HTML content"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEditDialog}
              disabled={updateContentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateContentMutation.isPending || !hasUnsavedEdits}
            >
              {updateContentMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <div className="report-print-hide flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
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
              {report.title ?? runDateLabel}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <GenerationStatusBadge status={report.status} />
              {report.title && <span>{runDateLabel}</span>}
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
            onClick={openEditDialog}
            disabled={generating || !report.content}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={generating || !report.content}
            title="Tip: turn off 'Headers and footers' in the print dialog for a cleaner PDF"
          >
            <Download className="mr-1 h-3 w-3" />
            Export PDF
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
          <div className="report-print-area mx-auto max-w-[1100px] rounded-xl bg-[#f5f6f8] p-4 sm:p-6">
            <HtmlReportFrame html={report.content} title={`Portfolio report — ${runDateLabel}`} />
            <ReportChartsSection communitySlug={slug} reportId={report.id} authenticated />
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            No content yet. Regenerate to produce the report body.
          </div>
        )}
      </div>
    </div>
  );
}
