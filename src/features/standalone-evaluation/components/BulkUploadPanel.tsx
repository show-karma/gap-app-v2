"use client";

import { Loader2, Play, RefreshCw } from "lucide-react";
import Papa from "papaparse";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { FileUpload } from "@/components/Utilities/FileUpload";
import { Button } from "@/components/ui/button";
import { useStartBulkJob } from "../hooks/useBulkJob";

interface BulkUploadPanelProps {
  sessionId: string;
}

interface PreviewState {
  rowCount: number;
  columns: string[];
  rows: string[][];
}

// Permissive email shape — full RFC validation lives on the BE Zod schema. We
// just guard against obvious mistakes here so the user gets immediate feedback.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkUploadPanel({ sessionId }: BulkUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [parsing, setParsing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notificationEmail, setNotificationEmail] = useState<string>("");

  const startBulk = useStartBulkJob();
  const trimmedEmail = notificationEmail.trim();
  const emailLooksValid = trimmedEmail === "" || EMAIL_REGEX.test(trimmedEmail);

  const parseFile = useCallback((selected: File) => {
    setParsing(true);
    setValidationError(null);
    setPreview(null);

    // Parse the FULL file (no preview cap) so the row count we surface to the
    // user matches what the BE will actually process. The whole file is sent
    // anyway and the BE caps at 10 MB / 500 rows, so this is bounded.
    Papa.parse<string[]>(selected, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length < 2) {
            setValidationError("CSV must include a header row and at least one application.");
            return;
          }
          const headers = results.data[0] as string[];
          const rows = (results.data.slice(1) as string[][]).filter((r) =>
            r.some((cell) => (cell ?? "").trim().length > 0)
          );
          if (rows.length === 0) {
            setValidationError("CSV has no application rows.");
            return;
          }
          // Cap the in-memory preview to the first 5 rows; the rowCount we
          // display below is the *true* count, not the preview length.
          setPreview({
            rowCount: rows.length,
            columns: headers,
            rows: rows.slice(0, 5),
          });
        } finally {
          setParsing(false);
        }
      },
      error: (err) => {
        setValidationError(err.message || "Failed to parse CSV");
        setParsing(false);
      },
    });
  }, []);

  const handleFileSelect = useCallback(
    (selected: File) => {
      if (!/\.csv$/i.test(selected.name) && selected.type !== "text/csv") {
        toast.error("Please upload a .csv file.");
        return;
      }
      setFile(selected);
      parseFile(selected);
    },
    [parseFile]
  );

  const handleStart = () => {
    if (!file) return;
    if (!emailLooksValid) return;
    startBulk.mutate({
      sessionId,
      file,
      notificationEmail: trimmedEmail || undefined,
    });
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setValidationError(null);
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Bulk evaluation</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV where each row is one application. We’ll evaluate them in the background and
          email you a download link when it’s ready.
        </p>
      </div>

      {file && preview ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {preview.rowCount === 1
                  ? "1 application detected"
                  : `${preview.rowCount} applications detected`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={startBulk.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  {preview.columns.map((c, i) => (
                    <th key={`${i}-${c}`} className="px-3 py-2 font-semibold">
                      {c || `col ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, idx) => {
                  const rowKey = `${idx}-${(row[0] ?? "").slice(0, 16)}`;
                  return (
                    <tr key={rowKey} className="border-t border-border">
                      {preview.columns.map((col, i) => (
                        <td
                          key={`${rowKey}-${col}-${i}`}
                          className="px-3 py-2 text-muted-foreground"
                        >
                          <span className="line-clamp-2">{row[i] ?? ""}</span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <FileUpload
          onFileSelect={handleFileSelect}
          acceptedFormats=".csv,text/csv"
          description="CSV with one application per row. Include a column named 'application' (or similar)."
          disabled={parsing || startBulk.isPending}
          uploadedFile={file}
        />
      )}

      {validationError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {validationError}
        </div>
      ) : null}

      {startBulk.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {startBulk.error.message}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="bulk-notification-email" className="text-sm font-medium text-foreground">
          Email when results are ready{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="bulk-notification-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          disabled={startBulk.isPending}
          className="block w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-invalid={!emailLooksValid}
        />
        <p className="text-xs text-muted-foreground">
          Wallet-only sign-ins have no email on file. Provide one here if you want a completion
          notification.
        </p>
        {!emailLooksValid ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            Enter a valid email address (or leave blank to skip).
          </p>
        ) : null}
      </div>

      <div>
        <Button
          type="button"
          onClick={handleStart}
          disabled={
            !file || !preview || Boolean(validationError) || !emailLooksValid || startBulk.isPending
          }
        >
          {startBulk.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting bulk job
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Start bulk evaluation
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
