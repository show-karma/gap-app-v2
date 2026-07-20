"use client";

import * as Sentry from "@sentry/nextjs";
import {
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useDeleteReport,
  useGenerateReport,
  usePortfolioReports,
  usePublishReport,
  useRegenerateReport,
  useReportConfigs,
  useReportRowSync,
  useUnpublishReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import {
  isReportGenerating,
  type PortfolioReport,
  type ReportConfig,
} from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { formatRunDate, formatScheduleLabel } from "@/utilities/portfolio-reports/period";
import { GenerationStatusBadge } from "./GenerationStatusBadge";

interface Props {
  community: Community;
}

/** Sentinel for "no type filter"; also the value the URL param is cleared to. */
const ALL_TYPES = "all";

interface ReportTypeOption {
  id: string;
  label: string;
}

/**
 * Report types for the admin filter: one per config that has a *generated*
 * report — draft or published. A report mid-generation (`generating`) or one
 * whose generation `failed` hasn't produced anything to review, so its config
 * doesn't count until it does. This is why the admin filter is broader than the
 * public one (published-only): the admin table shows drafts too.
 */
function deriveGeneratedTypes(
  reports: PortfolioReport[],
  configById: Map<string, ReportConfig>
): ReportTypeOption[] {
  const byId = new Map<string, string>();
  for (const report of reports) {
    if (report.status !== "draft" && report.status !== "published") continue;
    if (byId.has(report.reportConfigId)) continue;
    byId.set(
      report.reportConfigId,
      configById.get(report.reportConfigId)?.name ?? "(deleted config)"
    );
  }
  return Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function ReportTypeFilterSelect({
  types,
  value,
  onChange,
}: {
  types: ReportTypeOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="font-medium uppercase tracking-wider">Type</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Filter reports by type" className="h-8 max-w-[16rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES}>All report types</SelectItem>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Report name cell: the admin-authored title when set, otherwise the report
 * config's name. When a title is set the config name still shows underneath so
 * admins can tell which config produced the report.
 */
function ReportNameCell({ title, configName }: { title?: string | null; configName: string }) {
  return (
    <td className="px-4 py-3">
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{title ?? configName}</span>
      {title ? (
        <span className="mt-0.5 block text-xs font-normal text-zinc-500">{configName}</span>
      ) : null}
    </td>
  );
}

interface ReportTableRowProps {
  slug: string;
  report: PortfolioReport;
  configName: string;
  rowPending: boolean;
  activeMutationType: "publish" | "unpublish" | "regenerate" | "delete" | null;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

function ReportTableRow({
  slug,
  report: initialReport,
  configName,
  rowPending,
  activeMutationType,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onRegenerate,
  onDelete,
}: ReportTableRowProps) {
  const report = useReportRowSync(slug, initialReport);
  const fmt = formatRunDate(report.runDate);
  const generating = isReportGenerating(report);
  const failed = report.status === "failed";
  const actionsDisabled = rowPending || generating;
  // Drafts and failed generations can be removed; published reports back
  // public URLs (unpublish first) and generating reports are still in flight.
  const deletable = report.status === "draft" || failed;
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <ReportNameCell title={report.title} configName={configName} />
      <td className="px-4 py-3 text-zinc-500">{fmt.shortLabel}</td>
      <td className="px-4 py-3">
        <GenerationStatusBadge status={report.status} />
        {failed && report.generationError ? (
          <p className="mt-1 max-w-md truncate text-xs text-red-500" title={report.generationError}>
            {report.generationError}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-zinc-500">{report.modelId}</td>
      <td className="px-4 py-3 text-zinc-500">
        {new Date(report.generatedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} disabled={generating}>
            Edit
          </Button>
          {report.status === "draft" ? (
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <FileSearch className="mr-1 h-3 w-3" />
              Preview
            </Button>
          ) : null}
          {report.status === "draft" ? (
            <Button variant="ghost" size="sm" onClick={onPublish} disabled={actionsDisabled}>
              <Eye className="mr-1 h-3 w-3" />
              {rowPending && activeMutationType === "publish" ? "Publishing..." : "Publish"}
            </Button>
          ) : report.status === "published" ? (
            <Button variant="ghost" size="sm" onClick={onUnpublish} disabled={actionsDisabled}>
              <EyeOff className="mr-1 h-3 w-3" />
              {rowPending && activeMutationType === "unpublish" ? "Unpublishing..." : "Unpublish"}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={actionsDisabled}>
            <RefreshCw className="mr-1 h-3 w-3" />
            {rowPending && activeMutationType === "regenerate"
              ? "Regenerating..."
              : generating
                ? "Generating…"
                : failed
                  ? "Retry"
                  : "Regen"}
          </Button>
          {deletable ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={actionsDisabled}
              className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              {rowPending && activeMutationType === "delete" ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
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
  const deleteMutation = useDeleteReport(slug);

  const configById = useMemo(() => {
    const map = new Map<string, ReportConfig>();
    for (const cfg of configs ?? []) {
      if (cfg.id) map.set(cfg.id, cfg);
    }
    return map;
  }, [configs]);

  const activeConfigs = useMemo(() => (configs ?? []).filter((c) => c.isActive), [configs]);

  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: ALL_TYPES });

  const reportTypes = useMemo(
    () => deriveGeneratedTypes(reports ?? [], configById),
    [reports, configById]
  );

  // Clearing to null (not the sentinel) drops `?type=` from the URL.
  const handleTypeChange = (next: string) => {
    setTypeFilter(next === ALL_TYPES ? null : next);
  };

  const generatingConfigIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of reports ?? []) {
      if (isReportGenerating(r)) ids.add(r.reportConfigId);
    }
    return ids;
  }, [reports]);

  // Per-row pending state: track which report is being mutated and what action
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeMutationType, setActiveMutationType] = useState<
    "publish" | "unpublish" | "regenerate" | "delete" | null
  >(null);
  const [generatingConfigId, setGeneratingConfigId] = useState<string | null>(null);
  const [regenerateTargetId, setRegenerateTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
      toast.success("Generation started, this can take a few minutes.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`
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
    } catch (error) {
      Sentry.captureException(error);
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
    } catch (error) {
      Sentry.captureException(error);
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
      toast.success("Regeneration started, this can take a few minutes.");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        `Failed to start regeneration: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setActiveReportId(null);
      setActiveMutationType(null);
      setRegenerateTargetId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const reportId = deleteTargetId;
    setActiveReportId(reportId);
    setActiveMutationType("delete");
    try {
      await deleteMutation.mutateAsync(reportId);
      toast.success("Report deleted");
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        `Failed to delete report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setActiveReportId(null);
      setActiveMutationType(null);
      setDeleteTargetId(null);
    }
  };

  const isRowPending = (reportId: string) =>
    activeReportId === reportId &&
    (publishMutation.isPending ||
      unpublishMutation.isPending ||
      regenerateMutation.isPending ||
      deleteMutation.isPending);

  const sortedReports = (reports ?? []).slice().sort((a, b) => b.runDate.localeCompare(a.runDate));
  const visibleReports =
    typeFilter === ALL_TYPES
      ? sortedReports
      : sortedReports.filter((report) => report.reportConfigId === typeFilter);

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

      <DeleteDialog
        title="Delete this report? This can't be undone."
        deleteFunction={handleDelete}
        isLoading={deleteMutation.isPending}
        externalIsOpen={deleteTargetId !== null}
        externalSetIsOpen={(open) => {
          if (!open) setDeleteTargetId(null);
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
        <Button onClick={() => router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?new=1`)}>
          <Plus className="mr-2 h-4 w-4" />
          Configure New Report
        </Button>
      </div>

      {/* Per-config generate row */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Generate now</h2>
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
              onClick={() => router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?new=1`)}
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
                      router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug)}?editId=${cfg.id}`)
                    }
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => cfg.id && handleGenerate(cfg.id)}
                    disabled={
                      generatingConfigId !== null ||
                      (cfg.id ? generatingConfigIds.has(cfg.id) : false)
                    }
                  >
                    {generatingConfigId === cfg.id ||
                    (cfg.id && generatingConfigIds.has(cfg.id)) ? (
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {visibleReports.length} {pluralize("report", visibleReports.length)}
            </p>
            {reportTypes.length > 1 && (
              <ReportTypeFilterSelect
                types={reportTypes}
                value={typeFilter}
                onChange={handleTypeChange}
              />
            )}
          </div>

          {visibleReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
              <FileText className="mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">No reports of this type.</p>
              <button
                type="button"
                onClick={() => handleTypeChange(ALL_TYPES)}
                className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Show all reports
              </button>
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
                  {visibleReports.map((report: PortfolioReport) => (
                    <ReportTableRow
                      key={report.id}
                      slug={slug}
                      report={report}
                      configName={configById.get(report.reportConfigId)?.name ?? "(deleted config)"}
                      rowPending={isRowPending(report.id)}
                      activeMutationType={activeMutationType}
                      onEdit={() =>
                        router.push(`${PAGES.ADMIN.PORTFOLIO_REPORTS(slug)}/${report.id}`)
                      }
                      onPreview={() =>
                        router.push(PAGES.ADMIN.PORTFOLIO_REPORTS_PREVIEW(slug, report.id))
                      }
                      onPublish={() => handlePublish(report.id)}
                      onUnpublish={() => handleUnpublish(report.id)}
                      onRegenerate={() => setRegenerateTargetId(report.id)}
                      onDelete={() => setDeleteTargetId(report.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
