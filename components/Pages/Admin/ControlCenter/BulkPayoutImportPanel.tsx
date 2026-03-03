"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/Utilities/FileUpload";
import type {
  PayoutConfigItem,
  SavePayoutConfigResponse,
} from "@/src/features/payout-disbursement";
import { cn } from "@/utilities/tailwind";
import {
  buildPayoutConfigItems,
  type ImportDraftRow,
  parseImportRecords,
  summarizeSaveResponse,
  toErrorReport,
  validateAndMatchImportRows,
} from "./bulkPayoutImport";
import type { TableRow } from "./ControlCenterTable";

interface BulkPayoutImportPanelProps {
  tableRows: TableRow[];
  onApplyConfigs: (configs: PayoutConfigItem[]) => Promise<SavePayoutConfigResponse>;
  isApplying: boolean;
}

function downloadTextFile(fileName: string, content: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function BulkPayoutImportPanel({
  tableRows,
  onApplyConfigs,
  isApplying,
}: BulkPayoutImportPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const [fatalErrors, setFatalErrors] = useState<string[]>([]);
  const [draftRows, setDraftRows] = useState<ImportDraftRow[]>([]);

  const validatedRows = useMemo(
    () => validateAndMatchImportRows(draftRows, tableRows),
    [draftRows, tableRows]
  );
  const validRows = useMemo(
    () => validatedRows.filter((row) => row.status === "valid"),
    [validatedRows]
  );
  const invalidRows = useMemo(
    () => validatedRows.filter((row) => row.status === "invalid"),
    [validatedRows]
  );

  const handleParsedRecords = (records: unknown[][]) => {
    const parsed = parseImportRecords(records);
    setFatalErrors(parsed.fatalErrors);
    setDraftRows(parsed.rows);
    if (parsed.fatalErrors.length > 0) {
      toast.error(parsed.fatalErrors[0]);
      return;
    }
    toast.success(`Parsed ${parsed.rows.length} row(s)`);
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    setUploadedFile(file);
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const records = Array.isArray(results.data) ? (results.data as unknown[][]) : [];
        handleParsedRecords(records);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleParsePaste = () => {
    const value = pasteValue.trim();
    if (!value) {
      toast.error("Paste CSV data first");
      return;
    }

    const result = Papa.parse(value, {
      header: false,
      skipEmptyLines: true,
    });
    const records = Array.isArray(result.data) ? (result.data as unknown[][]) : [];
    handleParsedRecords(records);
  };

  const handleDownloadTemplate = () => {
    const header = [
      "grantUID",
      "projectUID",
      "projectSlug",
      "projectName",
      "payoutAddress",
      "amount",
    ].join(",");
    const rows = tableRows.map((row) =>
      [
        row.grantUid,
        row.projectUid,
        row.projectSlug || "",
        row.projectName || "",
        row.currentPayoutAddress || "",
        row.currentAmount || "",
      ]
        .map((value) => toCsvValue(value))
        .join(",")
    );
    downloadTextFile("payout-bulk-template.csv", `${header}\n${rows.join("\n")}`, "text/csv");
  };

  const handleDownloadErrors = () => {
    const report = toErrorReport(validatedRows, fatalErrors);
    downloadTextFile("payout-import-errors.txt", report);
  };

  const handleEditRow = (
    rowNumber: number,
    field: keyof Omit<ImportDraftRow, "rowNumber">,
    value: string
  ) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, [field]: value } : row))
    );
  };

  const handleApply = async () => {
    if (fatalErrors.length > 0) {
      toast.error("Resolve fatal parsing errors before applying");
      return;
    }

    const configs = buildPayoutConfigItems(validatedRows);
    if (configs.length === 0) {
      toast.error("No valid rows to apply");
      return;
    }

    try {
      const response = await onApplyConfigs(configs);
      const { successCount, failedCount } = summarizeSaveResponse(response);
      if (successCount > 0) {
        toast.success(`Saved ${successCount} payout config(s)`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} payout config(s) failed on save`);
      }
      if (failedCount === 0) {
        setUploadedFile(null);
        setPasteValue("");
        setDraftRows([]);
        setFatalErrors([]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to apply import";
      toast.error(message);
    }
  };

  const hasRows = draftRows.length > 0;

  return (
    <div className="px-4">
      <div className="w-full rounded-lg border border-gray-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="bulk-import-content"
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors rounded-lg"
        >
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              Bulk Import Payout Configs
            </h3>
            {!isExpanded && (
              <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
                Upload/paste CSV and apply many payout addresses + amounts in one batch
              </p>
            )}
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>

        <div
          id="bulk-import-content"
          className={cn(
            "transition-all duration-200 overflow-hidden border-t border-gray-200 dark:border-zinc-800",
            isExpanded ? "max-h-[1200px]" : "max-h-0 border-t-0"
          )}
        >
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border",
                  mode === "upload"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                    : "bg-white text-gray-700 border-gray-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700"
                )}
              >
                Upload CSV
              </button>
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border",
                  mode === "paste"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                    : "bg-white text-gray-700 border-gray-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700"
                )}
              >
                Paste CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Download Template (Loaded Rows)
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Matching priority: grantUID, projectUID, projectSlug/projectURL, then projectName.
              Name/slug matching applies to the currently loaded page only; for other pages use
              grantUID + projectUID (included in the template). Ambiguous or invalid rows are
              blocked until fixed.
            </p>

            {mode === "upload" ? (
              <FileUpload
                onFileSelect={handleFileSelect}
                acceptedFormats=".csv"
                uploadedFile={uploadedFile}
                disabled={isApplying}
                description="Expected columns: grantUID/projectUID/projectSlug/projectName, payoutAddress, amount"
              />
            ) : (
              <div className="space-y-2">
                <textarea
                  value={pasteValue}
                  onChange={(event) => setPasteValue(event.target.value)}
                  placeholder="Paste CSV rows including header"
                  className="w-full min-h-[160px] rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
                  disabled={isApplying}
                >
                  Parse Pasted Data
                </button>
              </div>
            )}

            {fatalErrors.length > 0 && (
              <div className="rounded-md border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Import blocked</p>
                <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc pl-5">
                  {fatalErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {hasRows && (
              <div className="space-y-3">
                <div className="rounded-md bg-gray-50 dark:bg-zinc-900 p-3 text-sm text-gray-700 dark:text-zinc-300">
                  <p>Total rows: {validatedRows.length}</p>
                  <p className="text-green-700 dark:text-green-400">Valid: {validRows.length}</p>
                  <p className="text-red-700 dark:text-red-400">Invalid: {invalidRows.length}</p>
                </div>

                {invalidRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                        Invalid rows (editable)
                      </h4>
                      <button
                        type="button"
                        onClick={handleDownloadErrors}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Download error report
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                      <table className="min-w-[1000px] w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300">
                          <tr>
                            <th className="px-2 py-2 text-left">Row</th>
                            <th className="px-2 py-2 text-left">grantUID</th>
                            <th className="px-2 py-2 text-left">projectUID</th>
                            <th className="px-2 py-2 text-left">projectSlug</th>
                            <th className="px-2 py-2 text-left">projectName</th>
                            <th className="px-2 py-2 text-left">payoutAddress</th>
                            <th className="px-2 py-2 text-left">amount</th>
                            <th className="px-2 py-2 text-left">Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invalidRows.slice(0, 25).map((row) => (
                            <tr
                              key={row.rowNumber}
                              className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                            >
                              <td className="px-2 py-2">{row.rowNumber}</td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.grantUID}
                                  onChange={(event) =>
                                    handleEditRow(row.rowNumber, "grantUID", event.target.value)
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.projectUID}
                                  onChange={(event) =>
                                    handleEditRow(row.rowNumber, "projectUID", event.target.value)
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.projectSlug}
                                  onChange={(event) =>
                                    handleEditRow(row.rowNumber, "projectSlug", event.target.value)
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.projectName}
                                  onChange={(event) =>
                                    handleEditRow(row.rowNumber, "projectName", event.target.value)
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.payoutAddress}
                                  onChange={(event) =>
                                    handleEditRow(
                                      row.rowNumber,
                                      "payoutAddress",
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  value={row.amount}
                                  onChange={(event) =>
                                    handleEditRow(row.rowNumber, "amount", event.target.value)
                                  }
                                  className="w-full rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1"
                                />
                              </td>
                              <td className="px-2 py-2 text-red-700 dark:text-red-300">
                                {row.errors.join("; ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {invalidRows.length > 25 && (
                      <p className="text-xs text-gray-500 dark:text-zinc-500">
                        Showing first 25 invalid rows. Download the full error report for all
                        issues.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isApplying || validRows.length === 0 || fatalErrors.length > 0}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium text-white",
                      "bg-brand-blue hover:bg-brand-blue/90",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isApplying ? "Applying..." : `Apply ${validRows.length} Valid Row(s)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      setPasteValue("");
                      setDraftRows([]);
                      setFatalErrors([]);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900"
                    disabled={isApplying}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
