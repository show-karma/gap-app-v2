"use client";

import { ChevronDown, Download } from "lucide-react";
import pluralize from "pluralize";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useExportReportAll,
  useExportReportSection,
  useReportExportManifest,
} from "@/hooks/portfolio-reports/useReportExport";
import type { ReportExportManifestEntry } from "@/types/portfolio-report";

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
  const manifest = useReportExportManifest(communitySlug, reportId, open);
  const exportSection = useExportReportSection(communitySlug, reportId);
  const exportAll = useExportReportAll(communitySlug, reportId);

  const isExporting = exportSection.isPending || exportAll.isPending;
  const sections = orderSections(manifest.data?.sections ?? []);

  const renderSections = () => {
    if (manifest.isLoading) {
      return (
        <DropdownMenuItem disabled className="text-sm text-zinc-500">
          Loading sections…
        </DropdownMenuItem>
      );
    }
    if (manifest.isError) {
      return (
        <DropdownMenuItem
          onClick={() => manifest.refetch()}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isExporting}
          onClick={() => exportAll.mutate()}
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          All sections (JSON)
        </DropdownMenuItem>
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
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export raw data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderSections()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDataMenu;
