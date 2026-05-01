"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Download, Loader2, X, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";
import { useBulkJobProgress } from "../hooks/useBulkJob";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";
import { BulkResultTable } from "./BulkResultTable";

interface BulkProgressViewProps {
  sessionId: string;
  jobId: string;
}

interface ProgressMetrics {
  total: number;
  done: number;
  percent: number;
  failedCount: number;
}

function computeMetrics(
  totalApplications: number,
  completedApplications: number,
  failedApplications: number,
  isComplete: boolean
): ProgressMetrics {
  const total = totalApplications;
  const done = completedApplications + failedApplications;
  let percent = 0;
  if (total > 0) {
    percent = Math.min(100, Math.round((done / total) * 100));
  } else if (isComplete) {
    percent = 100;
  }
  return { total, done, percent, failedCount: failedApplications };
}

function StatusIcon({ status }: { status: "DONE" | "FAILED" | "RUNNING" }) {
  if (status === "DONE") return <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />;
  if (status === "FAILED") return <XCircle className="h-5 w-5 text-red-600" aria-hidden />;
  return <Loader2 className="h-5 w-5 animate-spin text-brand-500" aria-hidden />;
}

function statusTitle(status: "DONE" | "FAILED" | "RUNNING"): string {
  if (status === "DONE") return "Bulk evaluation complete";
  if (status === "FAILED") return "Bulk evaluation failed";
  return "Bulk evaluation in progress";
}

interface DownloadButtonProps {
  sessionId: string;
  jobId: string;
}

function DownloadButton({ sessionId, jobId }: DownloadButtonProps) {
  // BE serializes the stored {columns, rows} to CSV on demand and streams
  // it back. We read as a Blob, build an object URL, and trigger a download
  // via a synthetic anchor click. Using `useMutation` so loading/error
  // state goes through React Query rather than ad-hoc useState.
  const downloadMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const blob = await standaloneEvaluationService.downloadBulkResultCsv(sessionId, jobId);
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `bulk-evaluation-${jobId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        // Revoke after a tick so the browser has a chance to start the download.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't download results");
    },
  });

  const downloading = downloadMutation.isPending;
  const handle = () => downloadMutation.mutate();

  return (
    <Button type="button" onClick={handle} disabled={downloading}>
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing download
        </>
      ) : (
        <>
          <Download className="h-4 w-4" /> Download results CSV
        </>
      )}
    </Button>
  );
}

export function BulkProgressView({ sessionId, jobId }: BulkProgressViewProps) {
  const { progress, dismiss } = useBulkJobProgress(sessionId, jobId);

  const isDone = progress.status === "COMPLETED";
  const isFailed = progress.status === "FAILED" || progress.status === "ERROR";
  const status: "DONE" | "FAILED" | "RUNNING" = isDone ? "DONE" : isFailed ? "FAILED" : "RUNNING";

  const { total, done, percent, failedCount } = computeMetrics(
    progress.totalApplications,
    progress.completedApplications,
    progress.failedApplications,
    isDone
  );

  const progressDescription =
    total > 0
      ? `${done} of ${total} ${total === 1 ? "application" : "applications"} processed (${percent}%)`
      : "Waiting for processing to start…";
  const failureDescription =
    failedCount > 0 ? ` · ${failedCount} ${failedCount === 1 ? "failure" : "failures"}` : "";

  return (
    <section
      className="space-y-4 rounded-xl border border-border bg-card p-6"
      aria-live="polite"
      aria-label="Bulk evaluation progress"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h2 className="text-lg font-semibold text-foreground">{statusTitle(status)}</h2>
        </div>
        {status !== "RUNNING" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={dismiss}
            aria-label="Dismiss bulk job"
          >
            <X className="h-4 w-4" /> Dismiss
          </Button>
        ) : null}
      </header>

      <div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full transition-all", isFailed ? "bg-red-500" : "bg-brand-500")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {progressDescription}
          {failureDescription}
        </p>
      </div>

      {progress.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {progress.error}
        </div>
      ) : null}

      {isDone && progress.hasResult ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadButton sessionId={sessionId} jobId={jobId} />
          </div>
          <div className="mt-4">
            <BulkResultTable
              sessionId={sessionId}
              jobId={jobId}
              enabled={isDone && progress.hasResult}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
