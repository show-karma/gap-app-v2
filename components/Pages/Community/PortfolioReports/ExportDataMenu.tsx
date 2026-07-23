"use client";

import { AlertTriangle, ChevronDown, Download, Table2 } from "lucide-react";
import pluralize from "pluralize";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useExportReportSection,
  useExportReportWorkbook,
  useReportExportManifest,
} from "@/hooks/portfolio-reports/useReportExport";
import type { ReportExportManifestEntry } from "@/types/portfolio-report";
import { cn } from "@/utilities/tailwind";

interface ExportDataMenuProps {
  communitySlug: string;
  reportId: string;
}

/** Aging sections lead the list — they are the bi-weekly report's priority data. */
function orderSections(sections: ReportExportManifestEntry[]): ReportExportManifestEntry[] {
  return [...sections].sort((a, b) => {
    const aAging = a.key.startsWith("aging_analysis") ? 0 : 1;
    const bAging = b.key.startsWith("aging_analysis") ? 0 : 1;
    return aAging - bAging;
  });
}

export const ExportDataMenu: FC<ExportDataMenuProps> = ({ communitySlug, reportId }) => {
  const [open, setOpen] = useState(false);
  // A report's data is frozen when it is generated, so a report published two
  // weeks ago exports two-week-old numbers. Off by default: the snapshot is the
  // only source that matches the published report, and a refresh costs a full
  // recompute upstream.
  const [refresh, setRefresh] = useState(false);

  // Two manifests, because they answer different questions. The snapshot one
  // always loads and is the only authority on whether the report is legacy —
  // a refreshed manifest reports `live-refresh` for every report, which would
  // otherwise make a legacy report look snapshot-backed and hide its warning.
  const snapshotManifest = useReportExportManifest(communitySlug, reportId, open, false);
  const refreshedManifest = useReportExportManifest(communitySlug, reportId, open && refresh, true);
  const manifest = refresh ? refreshedManifest : snapshotManifest;

  const exportSection = useExportReportSection(communitySlug, reportId, refresh);
  const exportWorkbook = useExportReportWorkbook(communitySlug, reportId, refresh);

  const isExporting = exportSection.isPending || exportWorkbook.isPending;
  const sections = orderSections(manifest.data?.sections ?? []);
  const isLegacyReport = snapshotManifest.data?.snapshotSource === "live-recompute";

  const renderSections = () => {
    if (manifest.isLoading) {
      return (
        <DropdownMenuItem disabled className="text-sm text-zinc-500">
          {refresh ? "Rebuilding from current data…" : "Loading sections…"}
        </DropdownMenuItem>
      );
    }
    if (manifest.isError) {
      return (
        <DropdownMenuItem
          onSelect={(e) => {
            // Keep the menu open so the loading → result is visible on retry.
            e.preventDefault();
            manifest.refetch();
          }}
          className="text-sm text-red-600 dark:text-red-400 cursor-pointer"
        >
          Couldn’t load export options — retry
        </DropdownMenuItem>
      );
    }
    if (sections.length === 0) {
      return (
        <DropdownMenuItem disabled className="text-sm text-zinc-500">
          No exportable data in this report
        </DropdownMenuItem>
      );
    }
    return (
      <>
        <DropdownMenuItem
          disabled={isExporting}
          onClick={() => exportWorkbook.mutate()}
          className="flex items-center gap-2 text-sm cursor-pointer font-medium"
        >
          <Table2 className="h-3.5 w-3.5" />
          All sections (Excel): {pluralize("sheet", sections.length, true)}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {sections.map((section) => (
          <DropdownMenuItem
            key={section.key}
            disabled={isExporting}
            onClick={() => exportSection.mutate(section.key)}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            {section.title} — {pluralize("row", section.rowCount, true)}
          </DropdownMenuItem>
        ))}
      </>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="mr-1 h-3 w-3" />
          Export Data
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Export raw data</DropdownMenuLabel>
        {isLegacyReport ? (
          <div
            role="note"
            className="mx-1 mb-1 flex items-start gap-2 rounded-md bg-amber-50 px-2 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This report predates data snapshots. Its data is reconstructed from source records and
              may not exactly match the report as it was originally generated.
            </span>
          </div>
        ) : null}
        <DropdownMenuCheckboxItem
          checked={refresh}
          onCheckedChange={setRefresh}
          onSelect={(e) => {
            // Toggling re-fetches the manifest; keep the menu open to show it.
            e.preventDefault();
          }}
          disabled={isExporting}
          className="cursor-pointer text-sm"
        >
          <span className="flex flex-col">
            <span className={cn(refresh && "font-medium text-blue-700 dark:text-blue-400")}>
              {refresh ? "Using current data" : "Use current data instead"}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {refresh
                ? "Rebuilt from source records — newer than the published report."
                : "Report data is frozen at generation. Rebuild it from today’s records."}
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {renderSections()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDataMenu;
