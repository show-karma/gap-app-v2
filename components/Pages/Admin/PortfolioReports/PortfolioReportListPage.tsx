"use client";

import { Eye, EyeOff, FileSearch, FileText, Play, Plus, RefreshCw, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useGenerateReport,
  usePortfolioReports,
  usePublishReport,
  useRegenerateReport,
  useReportConfigs,
  useUnpublishReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { PortfolioReport, ReportConfig } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import {
  formatRunDate,
  formatScheduleLabel,
} from "@/utilities/portfolio-reports/period";

interface Props {
  community: Community;
}

interface ReportTableRowProps {
  report: PortfolioReport;
  configName: string;
  rowPending: boolean;
  activeMutationType: "publish" | "unpublish" | "regenerate" | null;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onRegenerate: () => void;
}

function ReportTableRow({
  report,
  configName,
  rowPending,
  activeMutationType,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onRegenerate,
}: ReportTableRowProps) {
  const fmt = formatRunDate(report.runDate);
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
        {configName}
      </td>
      <td className="px-4 py-3 text-zinc-500">{fmt.shortLabel}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            report.status === "published"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {report.status}
        </span>
        {report.generationError && <span className="ml-2 text-xs text-red-500">Error</span>}
      </td>
      <td className="px-4 py-3 text-zinc-500">{report.modelId}</td>
      <td className="px-4 py-3 text-zinc-500">
        {new Date(report.generatedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {report.status === "draft" ? (
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <FileSearch className="mr-1 h-3 w-3" />
              Preview
            </Button>
          ) : null}
          {report.status === "draft" ? (
            <Button variant="ghost" size="sm" onClick={onPublish} disabled={rowPending}>
              <Eye className="mr-1 h-3 w-3" />
              {rowPending && activeMutationType === "publish" ? "Publishing..." : "Publish"}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onUnpublish} disabled={rowPending}>
              <EyeOff className="mr-1 h-3 w-3" />
              {rowPending && activeMutationType === "unpublish" ? "Unpublishing..." : "Unpublish"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={rowPending}>
            <RefreshCw className="mr-1 h-3 w-3" />
            {rowPending && activeMutationType === "regenerate" ? "Regenerating..." : "Regen"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function PortfolioReportListPage({ community }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: reports, isLoading } = usePortfolioReports(slug);
  const {
    data: configs,
    isLoading: configsLoading,
    isError: configsError,
  } = useReportConfigs(slug);
  const generateMutation = useGenerateReport(slug);
  const publishMutation = usePublishReport(slug);
  const unpublishMutation = useUnpublishReport(slug);
  const regenerateMutation = useRegenerateReport(slug);

  const configById = useMemo(() => {
    const map = new Map<string, ReportConfig>();
    for (const cfg of configs ?? []) {
      if (cfg.id) map.set(cfg.id, cfg);
    }
    return map;
  }, [configs]);

  const activeConfigs = useMemo(
    () => (configs ?? []).filter((c) => c.isActive),
    [configs]
  );

  // Per-row pending state: track which report is being mutated and what action
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeMutationType, setActiveMutationType] = useState<
    "publish" | "unpublish" | "regenerate" | null
  >(null);
  const [generatingConfigId, setGeneratingConfigId] = useState<string | null>(null);
  const [regenerateTargetId, setRegenerateTargetId] = useState<string | null>(null);

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  const handleGenerate = async (configId: string) => {
    setGeneratingConfigId(configId);
    try {
      await generateMutation.mutateAsync({ configId });
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error(
        `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setGeneratingConfigId(null);
    }
  };

  const handlePublish = async (reportId: string) => {
    setActiveReportId(reportId);
    setActiveMutationType("publish");
    try {
      await publishMutation.mutateAsync(reportId);
      toast.success("Report published");
    } catch {
      toast.error("Failed to publish report");
    } finally {
      setActiveReportId(null);
      setActiveMutationType(null);
    }
  };

  const handleUnpublish = async (reportId: string) => {
    setActiveReportId(reportId);
    setActiveMutationType("unpublish");
    try {
      await unpublishMutation.mutateAsync(reportId);
      toast.success("Report unpublished");
    } catch {
      toast.error("Failed to unpublish report");
    } finally {
      setActiveReportId(null);
      setActiveMutationType(null);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateTargetId) return;
    const reportId = regenerateTargetId;
    setActiveReportId(reportId);
    setActiveMutationType("regenerate");
    try {
      await regenerateMutation.mutateAsync(reportId);
      toast.success("Report regenerated");
    } catch {
      toast.error("Failed to regenerate report");
    } finally {
      setActiveReportId(null);
      setActiveMutationType(null);
    }
  };

  const isRowPending = (reportId: string) =>
    activeReportId === reportId &&
    (publishMutation.isPending || unpublishMutation.isPending || regenerateMutation.isPending);

  const sortedReports = (reports ?? [])
    .slice()
    .sort((a, b) => b.runDate.localeCompare(a.runDate));

  return (
    <div className="space-y-6">
      <DeleteDialog
        title="This will overwrite the current draft. Continue?"
        deleteFunction={handleRegenerate}
        isLoading={regenerateMutation.isPending}
        externalIsOpen={regenerateTargetId !== null}
        externalSetIsOpen={(open) => {
          if (!open) setRegenerateTargetId(null);
        }}
        buttonElement={null}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Portfolio Reports</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Reports generated from your configured prompts.
          </p>
        </div>
        <Button
          onClick={() =>
            router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?new=1`)
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Configure New Report
        </Button>
      </div>

      {/* Per-config generate row */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Generate now
        </h2>
        {configsLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner className="h-4 w-4" />
            Loading configs…
          </div>
        ) : configsError ? (
          <p className="text-sm text-red-500">Failed to load configs.</p>
        ) : activeConfigs.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No active configs.{" "}
            <button
              type="button"
              className="text-blue-600 underline dark:text-blue-400"
              onClick={() =>
                router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?new=1`)
              }
            >
              Configure your first report
            </button>{" "}
            to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeConfigs.map((cfg) => (
              <li
                key={cfg.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {cfg.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {formatScheduleLabel(cfg.schedule)} · {cfg.programIds.length} program
                    {cfg.programIds.length === 1 ? "" : "s"} · {cfg.modelId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      cfg.id &&
                      router.push(
                        `${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?editId=${cfg.id}`
                      )
                    }
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => cfg.id && handleGenerate(cfg.id)}
                    disabled={generatingConfigId !== null}
                  >
                    {generatingConfigId === cfg.id ? (
                      <>
                        <Spinner className="mr-2 h-3 w-3" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3 w-3" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reports table */}
      {sortedReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <FileText className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            No reports generated yet. Configure your reports and click Generate above.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Report</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Run date</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Model</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Generated</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {sortedReports.map((report: PortfolioReport) => (
                <ReportTableRow
                  key={report.id}
                  report={report}
                  configName={
                    configById.get(report.reportConfigId)?.name ?? "(deleted config)"
                  }
                  rowPending={isRowPending(report.id)}
                  activeMutationType={activeMutationType}
                  onEdit={() => router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS(slug)}/${report.id}`)}
                  onPreview={() =>
                    router.push(PAGES.ADMIN.PORTFOLIO_REPORTS_PREVIEW(slug, report.id))
                  }
                  onPublish={() => handlePublish(report.id)}
                  onUnpublish={() => handleUnpublish(report.id)}
                  onRegenerate={() => setRegenerateTargetId(report.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
