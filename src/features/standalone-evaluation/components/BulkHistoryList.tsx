"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";
import { useBulkJobsList } from "../hooks/useBulkJob";
import type { BulkJobResponse } from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { BulkResultsDashboard } from "./BulkResultsDashboard";

interface BulkHistoryListProps {
  sessionId: string;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

function StatusIcon({ status }: { status: BulkJobResponse["status"] }) {
  if (status === "COMPLETED")
    return <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />;
  if (status === "FAILED") return <XCircle className="h-4 w-4 text-red-600" aria-hidden />;
  return <Loader2 className="h-4 w-4 animate-spin text-brand-500" aria-hidden />;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function BulkHistoryList({ sessionId }: BulkHistoryListProps) {
  const query = useBulkJobsList(sessionId);
  const activeJobId = useEvaluationDraftStore((s) => s.activeBulkJobIdBySession[sessionId]);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading bulk history…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <span>Couldn't load bulk history: {query.error?.message ?? "unknown error"}</span>
        <button
          type="button"
          className="self-start rounded border border-red-300 px-2 py-0.5 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const jobs = query.data ?? [];
  if (jobs.length === 0) {
    return <p className="text-xs text-muted-foreground">No bulk runs yet for this session.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">Past bulk runs</h3>
        <span className="text-xs text-muted-foreground">
          {jobs.length} {jobs.length === 1 ? "run" : "runs"}
        </span>
      </div>
      <ul className="space-y-2">
        {jobs.map((job) => (
          <BulkHistoryRow
            key={job.id}
            job={job}
            sessionId={sessionId}
            isActive={activeJobId === job.id}
          />
        ))}
      </ul>
    </div>
  );
}

interface BulkHistoryRowProps {
  job: BulkJobResponse;
  sessionId: string;
  isActive: boolean;
}

const BulkHistoryRow = React.memo(function BulkHistoryRow({
  job,
  sessionId,
  isActive,
}: BulkHistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isTerminal = TERMINAL_STATUSES.has(job.status);
  const canExpand = isTerminal && job.hasResult;

  return (
    <li
      className={cn("rounded-md border border-border bg-card", isActive && "ring-1 ring-brand-500")}
    >
      <div className="flex flex-wrap items-center gap-3 p-3 text-xs">
        <StatusIcon status={job.status} />
        <span className="font-mono text-muted-foreground" title={job.id}>
          {job.id.slice(0, 8)}
        </span>
        <span className="text-muted-foreground">
          {formatDate(job.completedAt ?? job.startedAt)}
        </span>
        <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {job.status}
        </span>
        <span className="ml-auto text-muted-foreground">
          {job.completedApplications}/{job.totalApplications} done
          {job.failedApplications > 0 ? ` · ${job.failedApplications} failed` : ""}
        </span>
        {canExpand ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Hide
              </>
            ) : (
              <>
                <ChevronRight className="h-3.5 w-3.5" /> View
              </>
            )}
          </Button>
        ) : null}
      </div>
      {expanded && canExpand ? (
        <div className="border-t border-border bg-muted/20 p-3">
          <BulkResultsDashboard sessionId={sessionId} jobId={job.id} enabled={true} />
        </div>
      ) : null}
    </li>
  );
});
