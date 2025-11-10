"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { Button } from "@/components/UI/button";
import { programScoresService, ProgramScoreUploadRequest, ProgramScoreUploadResult } from "@/services/programScoresService";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import toast from "react-hot-toast";
import { cn } from "@/utilities/tailwind";
import { ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { errorManager } from "@/components/Utilities/errorManager";

interface ProgramScoresUploadProps {
  communityUID: string;
  programs: GrantProgram[];
  defaultChainId?: number;
}

interface CsvRow {
  projectTitle: string;
  projectProfile: string;
  [key: string]: any; // Dynamic score columns
}

interface ParsedCsvData {
  rows: CsvRow[];
  scoreColumns: string[];
  totalRows: number;
  hasRequiredColumns: boolean;
  errors: string[];
}

export function ProgramScoresUpload({ communityUID, programs, defaultChainId }: ProgramScoresUploadProps) {
  const [selectedProgram, setSelectedProgram] = useState<GrantProgram | null>(null);
  const [chainId, setChainId] = useState<number>(defaultChainId || 42220); // Use community chainId or default to Celo
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProgramScoreUploadResult | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Check file size - max 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit. Please upload a smaller file.');
      setCsvFile(null);
      setParsedData(null);
      return;
    }

    setCsvFile(file);
    setUploadResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CsvRow[];
        const errors: string[] = [];

        // Check for required columns
        const headers = Object.keys(rows[0] || {});
        const hasProjectTitle = headers.includes('projectTitle');
        const hasProjectProfile = headers.includes('projectProfile');
        const hasRequiredColumns = hasProjectTitle && hasProjectProfile;

        if (!hasRequiredColumns) {
          if (!hasProjectTitle) errors.push("Missing required column: 'projectTitle'");
          if (!hasProjectProfile) errors.push("Missing required column: 'projectProfile'");
        }

        // Identify score columns (all columns except projectTitle and projectProfile)
        const scoreColumns = headers.filter(
          header => header !== 'projectTitle' && header !== 'projectProfile'
        );

        setParsedData({
          rows,
          scoreColumns,
          totalRows: rows.length,
          hasRequiredColumns,
          errors
        });

        if (errors.length > 0) {
          errors.forEach(error => toast.error(error));
        } else {
          toast.success(`Parsed ${rows.length} rows with ${scoreColumns.length} score columns`);
          setIsPreviewExpanded(true);
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
        setParsedData(null);
      }
    });
  }, []);

  const handleUpload = async () => {
    console.log("handleUpload called", { selectedProgram, parsedData, hasRequiredColumns: parsedData?.hasRequiredColumns });

    if (!selectedProgram || !parsedData || !parsedData.hasRequiredColumns) {
      toast.error("Please select a program and upload a valid CSV file");
      return;
    }

    setIsUploading(true);

    try {
      const request: ProgramScoreUploadRequest = {
        communityUID,
        programId: selectedProgram.programId || '',
        chainId: selectedProgram.chainID || chainId,
        csvData: parsedData.rows
      };

      console.log("Sending request:", request);
      const result = await programScoresService.uploadProgramScores(request);

      setUploadResult(result);

      if (result.failed.length > 0) {
        toast.success(`Uploaded ${result.successful} scores. ${result.failed.length} failed to match.`);
      } else {
        toast.success(`Successfully uploaded all ${result.successful} program scores!`);
      }

      // Reset form
      setCsvFile(null);
      setParsedData(null);
      setIsPreviewExpanded(false);

    } catch (error) {
      errorManager(
        `Error uploading program scores: ${error}`,
        error,
        {
          context: "ProgramScoresUpload",
          communityUID,
          programId: selectedProgram.programId,
          chainId: selectedProgram.chainID || chainId,
        },
        { error: "Failed to upload program scores" }
      );
      toast.error(error instanceof Error ? error.message : "Failed to upload program scores");
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = selectedProgram && parsedData && parsedData.hasRequiredColumns && !isUploading;

  return (
    <div className="bg-secondary rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 space-y-6">

        {/* Program Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Program *
          </label>
          <select
            value={selectedProgram ? `${selectedProgram.programId}_${selectedProgram.chainID}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [progId, chain] = e.target.value.split('_');
                const program = programs.find(p =>
                  p.programId === progId && p.chainID === parseInt(chain)
                );
                setSelectedProgram(program || null);
                if (program?.chainID) {
                  setChainId(program.chainID);
                }
              } else {
                setSelectedProgram(null);
              }
            }}
            className="bg-background text-foreground w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          >
            <option value="">Choose a program...</option>
            {programs.map((program) => (
              <option key={`${program.programId}_${program.chainID}`} value={`${program.programId}_${program.chainID}`}>
                {program.metadata?.title || program.programId} (Chain: {program.chainID})
              </option>
            ))}
          </select>
          {programs.length === 0 && (
            <p className="text-sm text-foreground-alt mt-1">No programs found for this community</p>
          )}
        </div>

        {/* Chain ID */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Chain ID *
          </label>
          <input
            type="number"
            value={chainId}
            onChange={(e) => setChainId(parseInt(e.target.value) || 0)}
            placeholder="42220"
            className="bg-background text-foreground w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          />
          <p className="text-sm text-foreground-alt mt-1">
            Chain ID where the program is deployed{defaultChainId ? ` (defaulting to community chain: ${defaultChainId})` : ' (e.g., 42220 for Celo)'}
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Upload CSV File *
          </label>
          <FileUpload
            onFileSelect={handleFileSelect}
            acceptedFormats=".csv"
            uploadedFile={csvFile}
            disabled={isUploading}
            description="CSV format: projectTitle, projectProfile, [score columns...] (Max 10MB)"
          />
        </div>

        {/* CSV Preview */}
        {parsedData && (
          <div className="border border-gray-200 rounded-md">
            <button
              onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                {parsedData.hasRequiredColumns ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  CSV Preview ({parsedData.totalRows} rows, {parsedData.scoreColumns.length} score columns)
                </span>
              </div>
              {isPreviewExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-foreground-alt" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-foreground-alt" />
              )}
            </button>

            {isPreviewExpanded && (
              <div className="p-4 border-t border-gray-200">
                {parsedData.errors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="font-medium text-red-800 mb-2">Validation Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {parsedData.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">Score Columns Detected:</h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.scoreColumns.map((column) => (
                      <span
                        key={column}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                      >
                        {column}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-foreground">Project Title</th>
                        <th className="text-left py-2 px-3 font-medium text-foreground">Project Profile</th>
                        {parsedData.scoreColumns.map((column) => (
                          <th key={column} className="text-left py-2 px-3 font-medium text-foreground">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-foreground">{row.projectTitle}</td>
                          <td className="py-2 px-3 text-foreground-alt truncate max-w-xs">
                            {row.projectProfile}
                          </td>
                          {parsedData.scoreColumns.map((column) => (
                            <td key={column} className="py-2 px-3 text-foreground">
                              {row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.rows.length > 5 && (
                    <p className="text-sm text-foreground-alt mt-2 text-center">
                      ... and {parsedData.rows.length - 5} more rows
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!canUpload}
            isLoading={isUploading}
            className={cn(
              "px-6 py-2",
            )}
          >
            {isUploading ? "Uploading..." : "Upload Program Scores"}
          </Button>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className={cn(
            "p-4 border rounded-md",
            uploadResult.failed.length > 0
              ? "bg-yellow-50 border-yellow-200"
              : "bg-green-50 border-green-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className={cn(
                "h-5 w-5",
                uploadResult.failed.length > 0 ? "text-yellow-500" : "text-green-500"
              )} />
              <span className={cn(
                "font-medium",
                uploadResult.failed.length > 0 ? "text-yellow-800" : "text-green-800"
              )}>
                Upload Results
              </span>
            </div>
            <div className={cn(
              "text-sm",
              uploadResult.failed.length > 0 ? "text-yellow-700" : "text-green-700"
            )}>
              <p>✅ Successfully uploaded: {uploadResult.successful} program scores</p>
              {uploadResult.failed.length > 0 && (
                <>
                  <p className="mt-1">⚠️ Failed to match: {uploadResult.failed.length} projects</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">View failed matches</summary>
                    <ul className="mt-1 ml-4 space-y-1">
                      {uploadResult.failed.map((projectName, index) => (
                        <li key={index}>• {projectName}</li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}