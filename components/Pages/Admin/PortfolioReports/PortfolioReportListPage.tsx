"use client";

import { Eye, EyeOff, FileSearch, FileText, Plus, RefreshCw, Settings } from "lucide-react";
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
  useUnpublishReport,
  useReportConfigs,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { PortfolioReport, ReportType } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import {
  formatPeriod,
  getPreviousPeriodId,
} from "@/utilities/portfolio-reports/period";

interface Props {
  community: Community;
}

interface BiweeklyPeriodInputProps {
  value: string;
  onChange: (next: string) => void;
}

function BiweeklyPeriodInput({ value, onChange }: BiweeklyPeriodInputProps) {
  // value is "YYYY-MM-Hx"; split into the YYYY-MM month (for native input)
  // and the H1/H2 selector. Falling back to the previous period keeps the
  // input populated when the parent gives us garbage.
  const isValid = /^(19|20)\d{2}-(0[1-9]|1[0-2])-H[12]$/.test(value);
  const month = isValid ? value.slice(0, 7) : getPreviousPeriodId("portfolio_biweekly").slice(0, 7);
  const half = isValid ? (value.slice(8) as "H1" | "H2") : ("H1" as const);

  const emit = (nextMonth: string, nextHalf: "H1" | "H2") => {
    onChange(`${nextMonth}-${nextHalf}`);
  };

  return (
    <>
      <div>
        <label htmlFor="generate-month" className="mb-1 block text-xs text-zinc-500">
          Month
        </label>
        <input
          id="generate-month"
          type="month"
          value={month}
          onChange={(e) => emit(e.target.value, half)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        />
      </div>
      <div>
        <label htmlFor="generate-half" className="mb-1 block text-xs text-zinc-500">
          Half
        </label>
        <select
          id="generate-half"
          value={half}
          onChange={(e) => emit(month, e.target.value as "H1" | "H2")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
        >
          <option value="H1">1st – 15th</option>
          <option value="H2">16th – end</option>
        </select>
      </div>
    </>
  );
}

interface ReportTableRowProps {
  report: PortfolioReport;
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
  rowPending,
  activeMutationType,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onRegenerate,
}: ReportTableRowProps) {
  const period = formatPeriod(report.reportMonth);
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
        {period.label}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">
        {period.reportType === "portfolio_biweekly" ? "Biweekly" : "Monthly"}
      </td>
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
  const { data: configs } = useReportConfigs(slug);
  const generateMutation = useGenerateReport(slug);
  const publishMutation = usePublishReport(slug);
  const unpublishMutation = useUnpublishReport(slug);
  const regenerateMutation = useRegenerateReport(slug);

  const configuredTypes = useMemo<ReportType[]>(() => {
    if (!configs || configs.length === 0) return [];
    const found = new Set<string>();
    for (const c of configs) {
      if (c.isActive) found.add(c.reportType);
    }
    const order: ReportType[] = ["portfolio_monthly", "portfolio_biweekly"];
    return order.filter((t) => found.has(t));
  }, [configs]);

  const [generateType, setGenerateType] = useState<ReportType>("portfolio_monthly");
  const [generatePeriod, setGeneratePeriod] = useState(() =>
    getPreviousPeriodId("portfolio_monthly")
  );
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Per-row pending state: track which report is being mutated and what action
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeMutationType, setActiveMutationType] = useState<
    "publish" | "unpublish" | "regenerate" | null
  >(null);

  // Regenerate confirmation dialog state
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

  const openGenerateDialog = () => {
    // Default to the first configured cadence so the dialog opens with a
    // valid identifier. Falls back to monthly if nothing is configured yet.
    const initialType = configuredTypes[0] ?? "portfolio_monthly";
    setGenerateType(initialType);
    setGeneratePeriod(getPreviousPeriodId(initialType));
    setShowGenerateDialog(true);
  };

  const handleTypeChange = (next: ReportType) => {
    setGenerateType(next);
    setGeneratePeriod(getPreviousPeriodId(next));
  };

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({
        month: generatePeriod,
        reportType: generateType,
      });
      toast.success("Report generated successfully");
      setShowGenerateDialog(false);
    } catch (error) {
      toast.error(
        `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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

  return (
    <div className="space-y-6">
      {/* Regenerate confirmation dialog */}
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
            Monthly and biweekly portfolio reports for your grant programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug))}
          >
            <Settings className="mr-2 h-4 w-4" />
            Config
          </Button>
          <Button onClick={openGenerateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {showGenerateDialog && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-3 text-sm font-medium">Generate Report</h3>
          {configuredTypes.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No active configs found. Create one in{" "}
              <button
                type="button"
                className="text-blue-600 underline dark:text-blue-400"
                onClick={() =>
                  router.push(PAGES.ADMIN.PORTFOLIO_REPORTS_CONFIG(slug))
                }
              >
                Config
              </button>{" "}
              first.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              {configuredTypes.length > 1 && (
                <div>
                  <label
                    htmlFor="generate-type"
                    className="mb-1 block text-xs text-zinc-500"
                  >
                    Cadence
                  </label>
                  <select
                    id="generate-type"
                    value={generateType}
                    onChange={(e) =>
                      handleTypeChange(e.target.value as ReportType)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {configuredTypes.includes("portfolio_monthly") && (
                      <option value="portfolio_monthly">Monthly</option>
                    )}
                    {configuredTypes.includes("portfolio_biweekly") && (
                      <option value="portfolio_biweekly">Biweekly</option>
                    )}
                  </select>
                </div>
              )}
              {generateType === "portfolio_monthly" ? (
                <div>
                  <label
                    htmlFor="generate-month"
                    className="mb-1 block text-xs text-zinc-500"
                  >
                    Month
                  </label>
                  <input
                    id="generate-month"
                    type="month"
                    value={generatePeriod}
                    onChange={(e) => setGeneratePeriod(e.target.value)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              ) : (
                <BiweeklyPeriodInput
                  value={generatePeriod}
                  onChange={setGeneratePeriod}
                />
              )}
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <FileText className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            No reports generated yet. Configure your report settings and generate your first report.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Period</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Cadence</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Model</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Generated</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {reports.map((report: PortfolioReport) => (
                <ReportTableRow
                  key={report.id}
                  report={report}
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
