"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  useEvaluateApplication,
  useMarkReadyForBulk,
  useSubmitFeedback,
} from "../hooks/useEvaluationRun";
import { useSession } from "../hooks/useEvaluationSessions";
import type { SessionResponse } from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { ApplicationInput } from "./ApplicationInput";
import { BulkHistoryList } from "./BulkHistoryList";
import { BulkProgressView } from "./BulkProgressView";
import { BulkUploadPanel } from "./BulkUploadPanel";
import { FeedbackComposer } from "./FeedbackComposer";
import { IterationHistory } from "./IterationHistory";
import { TemplateSavePanel } from "./TemplateSavePanel";

interface EvaluateWorkspaceProps {
  sessionId: string;
}

export function EvaluateWorkspace({ sessionId }: EvaluateWorkspaceProps) {
  const sessionQuery = useSession(sessionId);

  const evaluate = useEvaluateApplication();
  const submitFeedback = useSubmitFeedback();
  const markReady = useMarkReadyForBulk();

  const activeBulkJobId = useEvaluationDraftStore(
    (s) => s.activeBulkJobIdBySession[sessionId] ?? null
  );

  const session = sessionQuery.data;
  const results = useEvaluationDraftStore((s) => s.resultsBySession[sessionId] ?? []);
  const latestResult = useMemo(
    () =>
      results.length === 0
        ? null
        : [...results].sort((a, b) => a.iterationNumber - b.iterationNumber).at(-1),
    [results]
  );

  // When a session has a sample but no client-side history (e.g. user came back later),
  // we still allow the user to send feedback against the stored sample. The latest
  // result will appear in the history once they re-evaluate.

  useEffect(() => {
    if (!session) return;
    if (session.status !== "READY_FOR_BULK" && results.length >= 2) {
      // light hint via toast handled inside markReady mutation – nothing to do here
    }
  }, [session, results.length]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading session…
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <p className="font-medium">Couldn’t load this session.</p>
        <p>{sessionQuery.error.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => sessionQuery.refetch()}
          className="mt-3"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Session not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SessionSummaryCard session={session} />

      {!session.sampleApplication ? (
        <ApplicationInput
          sessionId={session.id}
          isRunning={evaluate.isPending}
          onRun={(applicationText) => evaluate.mutate({ sessionId: session.id, applicationText })}
        />
      ) : null}

      {evaluate.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {evaluate.error.message}
        </div>
      ) : null}

      <IterationHistory sessionId={session.id} style={session.evaluationStyle} />

      <FeedbackComposer
        hasSample={Boolean(session.sampleApplication) || Boolean(latestResult)}
        isPending={submitFeedback.isPending}
        onSubmit={async (feedback) => {
          await submitFeedback.mutateAsync({ sessionId: session.id, feedback });
        }}
      />

      {submitFeedback.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {submitFeedback.error.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <TemplateSavePanel session={session} />
        {session.status !== "READY_FOR_BULK" && Boolean(latestResult) ? (
          <Button
            type="button"
            onClick={() => markReady.mutate(session.id)}
            disabled={markReady.isPending}
            variant="outline"
          >
            {markReady.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Mark ready for bulk"
            )}
          </Button>
        ) : null}
      </div>

      {session.status === "READY_FOR_BULK" || activeBulkJobId ? (
        activeBulkJobId ? (
          <BulkProgressView sessionId={session.id} jobId={activeBulkJobId} />
        ) : (
          <BulkUploadPanel sessionId={session.id} />
        )
      ) : null}

      <BulkHistoryList sessionId={session.id} />
    </div>
  );
}

function SessionSummaryCard({ session }: { session: SessionResponse }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Session · {session.evaluationStyle}
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {session.programDescription.slice(0, 80) || "Untitled"}
          </h2>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {session.status.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>
    </section>
  );
}
