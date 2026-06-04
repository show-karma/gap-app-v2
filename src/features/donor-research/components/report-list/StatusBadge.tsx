import type { DonorResearchReportStatus } from "@/types/donor-research";

const STATUS_LABEL: Record<DonorResearchReportStatus, string> = {
  pending: "Queued",
  running_fast: "Fast pipeline running",
  fast_complete: "Fast complete",
  enriching: "Enriching (Deep)",
  re_enriching: "Re-enriching",
  complete: "Complete",
  failed: "Failed",
};

const STATUS_COLOR: Record<DonorResearchReportStatus, string> = {
  pending: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  running_fast: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  fast_complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  enriching: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  re_enriching: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

/**
 * Status badge shared by the report-list rows and the report-viewer
 * header (U13b/c). The color palette uses semantic tailwind classes —
 * never hardcoded hex — so dark mode + tenant theming continue to apply.
 */
export function StatusBadge({ status }: { status: DonorResearchReportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
