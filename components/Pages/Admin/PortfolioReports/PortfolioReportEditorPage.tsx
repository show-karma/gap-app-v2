"use client";

import { ArrowLeft, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { isReportGenerating } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { GenerationStatusBadge } from "./GenerationStatusBadge";

interface Props {
  community: Community;
  reportId: string;
}

// Extracts the in-app navigation target from an anchor click, or null if the
// click should be ignored (external link, new tab, same-page anchor, etc.).
function getInAppNavTarget(e: MouseEvent): string | null {
  if (e.defaultPrevented) return null;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return null;
  const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return null;
  const href = anchor.getAttribute("href");
  if (!href) return null;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return url.pathname + url.search + url.hash;
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDirtyRef = useRef(false);

  // Initialize local markdown from fetched report
  const currentMarkdown = markdown ?? report?.markdown ?? "";

  // Dirty flag: local edits differ from the saved value
  const isDirty = markdown !== null && markdown !== (report?.markdown ?? "");

  // Keep a ref so event handlers always see the latest value without re-binding.
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Browser refresh/close/external nav — show the native confirm.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // In-app nav — intercept anchor clicks on capture phase so they can't slip past.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      const target = getInAppNavTarget(e);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(target);
      setShowUnsavedDialog(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

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
      await regenerateMutation.mutateAsync(reportId);
      setMarkdown(null);
      toast.success("Regeneration started, this can take a few minutes.");
    } catch (error) {
      toast.error(
        `Failed to start regeneration: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Unsaved changes confirmation dialog */}
      <DeleteDialog
        title="You have unsaved changes. Leave without saving?"
        deleteFunction={async () => {
          const href = pendingHref;
          // Discard local edits so the beforeunload + click guards don't re-fire
          setMarkdown(null);
          setPendingHref(null);
          // Let state flush before navigating
          await Promise.resolve();
          if (href) {
            router.push(href);
          } else {
            navigateBack();
          }
        }}
        isLoading={false}
        externalIsOpen={showUnsavedDialog}
        externalSetIsOpen={(open) => {
          setShowUnsavedDialog(open);
          if (!open) setPendingHref(null);
        }}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            aria-label="Back to portfolio reports"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatRunDate(report.runDate).label}
              {isDirty && <span className="ml-2 text-sm font-normal text-zinc-400">(unsaved)</span>}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={updateMarkdownMutation.isPending || generating}
          >
            <Save className="mr-1 h-3 w-3" />
            {updateMarkdownMutation.isPending ? "Saving..." : "Save"}
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
