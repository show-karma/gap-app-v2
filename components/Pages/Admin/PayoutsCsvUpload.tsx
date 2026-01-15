"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import Papa from "papaparse";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { PROJECT_NAME } from "@/constants/brand";
import { cn } from "@/utilities/tailwind";

export interface CsvPayoutData {
  projectSlug: string;
  payoutAddress: string;
  amount: string;
}

export interface CsvParseResult {
  data: CsvPayoutData[];
  unmatchedProjects: string[];
}

interface PayoutsCsvUploadProps {
  onDataParsed: (result: CsvParseResult) => void;
  disabled?: boolean;
  unmatchedProjects?: string[];
  onDownloadExample?: () => void;
}

export function PayoutsCsvUpload({
  onDataParsed,
  disabled,
  unmatchedProjects,
  onDownloadExample,
}: PayoutsCsvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [parseResults, setParseResults] = useState<{
    successful: number;
    failed: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const extractProjectSlug = (url: string): string | null => {
    if (!url || typeof url !== "string") return null;

    // Match various KarmaGAP URL patterns
    const patterns = [/\/project\/([^/\s?#]+)/, /\/projects\/([^/\s?#]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  const findColumn = (headers: string[], possibleNames: string[]): number => {
    const normalizedHeaders = headers.map((h) =>
      h
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "")
    );

    for (const name of possibleNames) {
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const index = normalizedHeaders.findIndex((h) => h.includes(normalizedName));
      if (index !== -1) return index;
    }

    return -1;
  };

  const processFile = useCallback(
    (file: File) => {
      setIsProcessing(true);
      setParseResults(null);

      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (!results.data || results.data.length < 2) {
              toast.error("CSV file appears to be empty or only contains headers");
              setIsProcessing(false);
              return;
            }

            const headers = results.data[0] as string[];
            const dataRows = results.data.slice(1) as string[][];

            // Find columns with flexible naming
            const projectColIndex = findColumn(headers, [
              `${PROJECT_NAME.replace(/\s+/g, "")} Profile`,
              PROJECT_NAME.replace(/\s+/g, ""),
              "Profile",
              "Project",
              "Project URL",
              "URL",
            ]);

            const addressColIndex = findColumn(headers, [
              "Wallet Address",
              "Address",
              "Payout Address",
              "Wallet",
              "Recipient",
            ]);

            const amountColIndex = findColumn(headers, [
              "PRIZE WON",
              "Amount",
              "Prize",
              "Payout Amount",
              "Value",
            ]);

            if (projectColIndex === -1) {
              toast.error("Could not find project/profile column in CSV");
              setIsProcessing(false);
              return;
            }

            if (addressColIndex === -1) {
              toast.error("Could not find wallet address column in CSV");
              setIsProcessing(false);
              return;
            }

            if (amountColIndex === -1) {
              toast.error("Could not find amount column in CSV");
              setIsProcessing(false);
              return;
            }

            const parsedData: CsvPayoutData[] = [];
            const errors: string[] = [];
            let successful = 0;
            let failed = 0;
            let skipped = 0;

            dataRows.forEach((row, index) => {
              const rowNum = index + 2; // +2 because we start from row 2 (after headers)

              const projectUrl = row[projectColIndex]?.trim();
              const address = row[addressColIndex]?.trim();
              const amount = row[amountColIndex]?.trim();

              if (!projectUrl && !address && !amount) {
                // Skip completely empty rows
                return;
              }

              let hasError = false;
              const rowErrors: string[] = [];

              // Extract project slug
              const projectSlug = extractProjectSlug(projectUrl);
              if (!projectSlug) {
                rowErrors.push(`Row ${rowNum}: Invalid or missing project URL`);
                hasError = true;
              }

              // Validate address - skip row if missing, only error if invalid
              if (!address) {
                // Skip rows with missing addresses silently
                skipped++;
                return;
              } else if (!isAddress(address)) {
                rowErrors.push(`Row ${rowNum}: Invalid wallet address: ${address}`);
                hasError = true;
              }

              // Validate amount
              if (!amount) {
                rowErrors.push(`Row ${rowNum}: Missing amount`);
                hasError = true;
              } else {
                const numAmount = parseFloat(amount);
                if (Number.isNaN(numAmount) || numAmount <= 0) {
                  rowErrors.push(`Row ${rowNum}: Invalid amount: ${amount}`);
                  hasError = true;
                } else if (!/^\d+(\.\d{1,18})?$/.test(amount)) {
                  rowErrors.push(
                    `Row ${rowNum}: Amount must have at most 18 decimal places: ${amount}`
                  );
                  hasError = true;
                }
              }

              if (hasError) {
                failed++;
                errors.push(...rowErrors);
              } else {
                successful++;
                parsedData.push({
                  projectSlug: projectSlug!,
                  payoutAddress: address,
                  amount: amount,
                });
              }
            });

            setParseResults({ successful, failed, skipped, errors });

            if (parsedData.length > 0) {
              // Pass the parsed data to parent component for matching
              onDataParsed({ data: parsedData, unmatchedProjects: [] });
              toast.success(`Successfully parsed ${successful} entries`);
            } else {
              toast.error("No valid entries found in CSV");
            }

            if (errors.length > 0) {
              console.error("CSV parsing errors:", errors);
            }
          } catch (error) {
            console.error("Error processing CSV:", error);
            toast.error("Failed to process CSV file");
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          console.error("Papa Parse error:", error);
          toast.error("Failed to parse CSV file");
          setIsProcessing(false);
        },
      });
    },
    [onDataParsed, extractProjectSlug, findColumn]
  );

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (selectedFile.type !== "text/csv") {
        toast.error("Please upload a CSV file");
        return;
      }

      setFile(selectedFile);
      processFile(selectedFile);
    },
    [processFile]
  );

  const handleNewUpload = useCallback(() => {
    setFile(null);
    setParseResults(null);
  }, []);

  return (
    <div className="w-full mb-6 border border-gray-200 dark:border-zinc-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload CSV File</h3>
          {!isExpanded && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Bulk populate payout addresses and amounts from CSV
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
        className={cn(
          "transition-all duration-200 overflow-hidden",
          isExpanded ? "max-h-[800px]" : "max-h-0"
        )}
      >
        <div className="p-4 border-t border-gray-200 dark:border-zinc-700">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a CSV file to bulk populate payout addresses and amounts.
              <br /> The CSV should contain columns for project URLs, wallet addresses, and amounts.
            </p>
            {onDownloadExample && (
              <button
                onClick={onDownloadExample}
                className="ml-4 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                Download Example CSV
              </button>
            )}
          </div>

          {file && parseResults ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Uploaded successfully
                  </p>
                </div>
                <button
                  onClick={handleNewUpload}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Upload new CSV
                </button>
              </div>

              {parseResults && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Parse Results
                    </h4>
                    {parseResults.errors.length > 0 && (
                      <button
                        onClick={() => {
                          const errorText = parseResults.errors.join("\n");
                          const blob = new Blob([errorText], {
                            type: "text/plain",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "csv-errors.txt";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Download error report
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="text-green-600 dark:text-green-400">
                      ✓ Successfully parsed: {parseResults.successful} entries
                    </p>
                    {parseResults.skipped > 0 && (
                      <p className="text-yellow-600 dark:text-yellow-400">
                        ⚠ Skipped (no wallet): {parseResults.skipped} entries
                      </p>
                    )}
                    {parseResults.failed > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        ✗ Failed: {parseResults.failed} entries
                      </p>
                    )}
                    {unmatchedProjects && unmatchedProjects.length > 0 && (
                      <p className="text-orange-600 dark:text-orange-400">
                        ⚠ Unmatched projects: {unmatchedProjects.length}
                      </p>
                    )}
                  </div>

                  {(parseResults.errors.length > 0 ||
                    (unmatchedProjects && unmatchedProjects.length > 0)) && (
                    <div className="mt-3 space-y-3">
                      {parseResults.errors.length > 0 && (
                        <div className="max-h-32 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Errors:
                          </p>
                          <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                            {parseResults.errors.slice(0, 5).map((error, index) => (
                              <p key={index}>{error}</p>
                            ))}
                            {parseResults.errors.length > 5 && (
                              <p className="text-gray-500 dark:text-gray-400">
                                ... and {parseResults.errors.length - 5} more errors
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {unmatchedProjects && unmatchedProjects.length > 0 && (
                        <div className="max-h-32 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unmatched project slugs:
                          </p>
                          <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                            {unmatchedProjects.slice(0, 5).map((slug, index) => (
                              <p key={index}>• {slug}</p>
                            ))}
                            {unmatchedProjects.length > 5 && (
                              <p className="text-gray-500 dark:text-gray-400">
                                ... and {unmatchedProjects.length - 5} more unmatched
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <FileUpload
              onFileSelect={handleFileSelect}
              acceptedFormats=".csv"
              disabled={disabled || isProcessing}
              uploadedFile={file}
              description="Expected columns: Project URL, Wallet Address, Amount"
            />
          )}
        </div>
      </div>
    </div>
  );
}
