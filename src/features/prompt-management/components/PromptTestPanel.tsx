"use client";

import { AlertCircle, ChevronDown, Loader2, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFundingApplications } from "@/hooks/useFundingPlatform";
import { cn } from "@/utilities/tailwind";
import type { PromptType, TestProgramPromptResult } from "../types/program-prompt";

interface PromptTestPanelProps {
  programId: string;
  promptType: PromptType;
  isOpen: boolean;
  onClose: () => void;
  onTest: (applicationId: string) => Promise<TestProgramPromptResult>;
  isLoading: boolean;
}

export function PromptTestPanel({
  programId,
  promptType,
  isOpen,
  onClose,
  onTest,
  isLoading,
}: PromptTestPanelProps) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [testResult, setTestResult] = useState<TestProgramPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompiledPrompt, setShowCompiledPrompt] = useState(false);

  const { applications, isLoading: isLoadingApplications } = useFundingApplications(programId, {
    limit: 100,
  });

  const applicationOptions = useMemo(() => {
    return applications.map((app) => ({
      value: app.referenceNumber,
      label: `${app.referenceNumber} - ${app.applicantEmail || "Unknown"}`,
    }));
  }, [applications]);

  const handleTest = async () => {
    if (!selectedApplicationId) {
      setError("Please select an application to test with");
      return;
    }

    setError(null);
    setTestResult(null);

    try {
      const result = await onTest(selectedApplicationId);
      setTestResult(result);
    } catch (err) {
      // Preserve error context for better debugging
      let errorMessage = "Failed to test prompt";
      if (err instanceof Error) {
        errorMessage = err.message;
        // Include cause if available (for chained errors)
        if (err.cause && err.cause instanceof Error) {
          errorMessage = `${errorMessage}: ${err.cause.message}`;
        }
      } else if (typeof err === "object" && err !== null) {
        // Handle API error responses with additional context
        const errObj = err as Record<string, unknown>;
        if (errObj.message) {
          errorMessage = String(errObj.message);
        }
        if (errObj.status) {
          errorMessage = `[${errObj.status}] ${errorMessage}`;
        }
      }
      setError(errorMessage);

      // Log full error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Prompt test error:", err);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Prompt</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {promptType === "external" ? "External AI Prompt" : "Internal Evaluation Prompt"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Application selector */}
        <div>
          <label
            htmlFor="test-application"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Select Application to Test
          </label>
          <div className="relative">
            <select
              id="test-application"
              value={selectedApplicationId}
              onChange={(e) => setSelectedApplicationId(e.target.value)}
              disabled={isLoadingApplications}
              className="w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {isLoadingApplications ? "Loading applications..." : "Select an application"}
              </option>
              {applicationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {applications.length === 0 && !isLoadingApplications && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              No applications found for this program.
            </p>
          )}
        </div>

        {/* Test button */}
        <button
          type="button"
          onClick={handleTest}
          disabled={isLoading || !selectedApplicationId}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className="space-y-4">
            {/* Status */}
            <div
              className={cn(
                "p-3 rounded-lg border",
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  testResult.success
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                )}
              >
                {testResult.success ? "Test Passed" : "Test Failed"}
              </p>
              {testResult.error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{testResult.error}</p>
              )}
            </div>

            {/* Result */}
            {testResult.result && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Result
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                    {testResult.result}
                  </pre>
                </div>
              </div>
            )}

            {/* Compiled prompt toggle */}
            {testResult.compiledPrompt && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCompiledPrompt(!showCompiledPrompt)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showCompiledPrompt ? "Hide" : "Show"} Compiled Prompt
                </button>
                {showCompiledPrompt && (
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {testResult.compiledPrompt}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Raw response */}
            {testResult.rawResponse !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Raw Response
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {JSON.stringify(testResult.rawResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
