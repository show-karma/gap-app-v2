"use client";

import {
  ArrowRight,
  History,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utilities/tailwind";
import { useEvaluateApplication, useSubmitFeedback } from "../hooks/useEvaluationRun";
import { useSession } from "../hooks/useEvaluationSessions";
import type { EvaluationResultResponse, SessionResponse } from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { ApplicationInput } from "./ApplicationInput";
import { BulkHistoryList } from "./BulkHistoryList";
import { BulkProgressView } from "./BulkProgressView";
import { BulkUploadPanel } from "./BulkUploadPanel";
import { FeedbackComposer } from "./FeedbackComposer";
import { PromptViewer } from "./PromptViewer";
import { TemplateSavePanel } from "./TemplateSavePanel";
import { WorkbenchResultPane } from "./WorkbenchResultPane";

interface EvaluateWorkspaceProps {
  sessionId: string;
}

type WorkbenchTab = "iterate" | "bulk" | "history";

const TABS: ReadonlyArray<{ id: WorkbenchTab; label: string; icon: typeof Sparkles }> = [
  { id: "iterate", label: "Iterate on sample", icon: Sparkles },
  { id: "bulk", label: "Bulk run", icon: Upload },
  { id: "history", label: "History", icon: History },
];

export function EvaluateWorkspace({ sessionId }: EvaluateWorkspaceProps) {
  const sessionQuery = useSession(sessionId);

  const evaluate = useEvaluateApplication();
  const submitFeedback = useSubmitFeedback();

  const activeBulkJobId = useEvaluationDraftStore(
    (s) => s.activeBulkJobIdBySession[sessionId] ?? null
  );

  const session = sessionQuery.data;
  const results = useEvaluationDraftStore((s) => s.resultsBySession[sessionId] ?? []);
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.iterationNumber - b.iterationNumber),
    [results]
  );
  const latestResult = sortedResults.at(-1) ?? null;

  const [tab, setTab] = useState<WorkbenchTab>("iterate");
  const [activeIterationNumber, setActiveIterationNumber] = useState<number | null>(null);

  // Auto-pin to the newest iteration whenever a fresh result lands so the
  // user lands on the result they just produced.
  useEffect(() => {
    if (latestResult) setActiveIterationNumber(latestResult.iterationNumber);
  }, [latestResult]);

  // If a bulk is running or the session is ready_for_bulk, jump straight to
  // the bulk tab so the user doesn't have to hunt for it.
  useEffect(() => {
    if (activeBulkJobId) setTab("bulk");
  }, [activeBulkJobId]);

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

  const hasSample = Boolean(session.sampleApplication) || Boolean(latestResult);
  // Bulk unlocks the moment any eval has run on this session; a "DRAFT"
  // session has no sample/run history, so we keep that gate. ITERATING and
  // READY_FOR_BULK both qualify — there's no separate "ready" checkpoint.
  const canRunBulk = session.status !== "DRAFT" || Boolean(activeBulkJobId);
  const activeIteration = activeIterationNumber ?? latestResult?.iterationNumber ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <SessionHeader session={session} iterationCount={sortedResults.length} />

      <div className="border-b border-border px-5 py-3">
        <PromptViewer session={session} />
      </div>

      <div role="tablist" className="flex gap-1 border-b border-border px-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`evaluate-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`evaluate-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "iterate" ? (
        <div role="tabpanel" id="evaluate-panel-iterate" aria-labelledby="evaluate-tab-iterate">
          <IterateLayout
            session={session}
            hasSample={hasSample}
            isEvaluating={evaluate.isPending}
            isSubmittingFeedback={submitFeedback.isPending}
            results={sortedResults}
            activeIterationNumber={activeIteration}
            onSelectIteration={setActiveIterationNumber}
            evaluateError={evaluate.isError ? evaluate.error.message : null}
            feedbackError={submitFeedback.isError ? submitFeedback.error.message : null}
            onRunInitial={(applicationText) =>
              evaluate.mutate({ sessionId: session.id, applicationText })
            }
            onSubmitFeedback={async (feedback) => {
              await submitFeedback.mutateAsync({ sessionId: session.id, feedback });
            }}
            onSwitchToBulk={() => setTab("bulk")}
          />
        </div>
      ) : tab === "bulk" ? (
        <div role="tabpanel" id="evaluate-panel-bulk" aria-labelledby="evaluate-tab-bulk">
          <BulkLayout
            session={session}
            activeBulkJobId={activeBulkJobId}
            canRunBulk={canRunBulk}
            onSwitchToIterate={() => setTab("iterate")}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="evaluate-panel-history"
          aria-labelledby="evaluate-tab-history"
          className="p-5"
        >
          <BulkHistoryList sessionId={session.id} />
        </div>
      )}
    </div>
  );
}

function SessionHeader({
  session,
  iterationCount,
}: {
  session: SessionResponse;
  iterationCount: number;
}) {
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  return (
    <header className="flex flex-col gap-2 border-b border-border px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Session · {session.evaluationStyle}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
            {session.status.replace(/_/g, " ").toLowerCase()}
            {iterationCount > 0
              ? ` · ${iterationCount} ${iterationCount === 1 ? "run" : "runs"}`
              : ""}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Session actions"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSaveTemplateOpen(true)}>
              <Save className="h-3.5 w-3.5" /> Save as template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TemplateSavePanel
          session={session}
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
        />
      </div>
      <h1 className="text-lg font-semibold leading-tight text-foreground">
        {session.programDescription.slice(0, 200) || "Untitled session"}
      </h1>
    </header>
  );
}

interface IterateLayoutProps {
  session: SessionResponse;
  hasSample: boolean;
  isEvaluating: boolean;
  isSubmittingFeedback: boolean;
  results: ReadonlyArray<EvaluationResultResponse>;
  activeIterationNumber: number;
  onSelectIteration: (n: number) => void;
  evaluateError: string | null;
  feedbackError: string | null;
  onRunInitial: (applicationText: string) => void;
  onSubmitFeedback: (feedback: string) => Promise<void>;
  onSwitchToBulk: () => void;
}

function IterateLayout({
  session,
  hasSample,
  isEvaluating,
  isSubmittingFeedback,
  results,
  activeIterationNumber,
  onSelectIteration,
  evaluateError,
  feedbackError,
  onRunInitial,
  onSubmitFeedback,
  onSwitchToBulk,
}: IterateLayoutProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      <section className="flex min-h-[28rem] min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        {!hasSample ? (
          <div className="p-5">
            <ApplicationInput
              sessionId={session.id}
              isRunning={isEvaluating}
              onRun={onRunInitial}
            />
            {evaluateError ? (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400">{evaluateError}</p>
            ) : null}
          </div>
        ) : (
          <>
            <SamplePanel session={session} />
            <div className="border-t border-border bg-background p-4">
              <FeedbackComposer
                hasSample={hasSample}
                isPending={isSubmittingFeedback}
                onSubmit={onSubmitFeedback}
              />
              {feedbackError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{feedbackError}</p>
              ) : null}
            </div>
          </>
        )}
      </section>

      <section className="flex min-w-0 flex-col">
        <WorkbenchResultPane
          results={results}
          style={session.evaluationStyle}
          activeIterationNumber={activeIterationNumber}
          onSelectIteration={onSelectIteration}
        />
        {results.length > 0 ? (
          <button
            type="button"
            onClick={onSwitchToBulk}
            className="group flex items-center justify-center gap-1.5 border-t border-border bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Happy with this run? Run it on the full CSV
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : null}
      </section>
    </div>
  );
}

function SamplePanel({ session }: { session: SessionResponse }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sample application
        </span>
        {session.sampleApplication ? (
          <span className="text-[11px] text-muted-foreground">
            · {session.sampleApplication.length.toLocaleString()} chars · pinned
          </span>
        ) : null}
      </div>
      <div className="max-h-[24rem] flex-1 overflow-y-auto overflow-x-hidden p-5 lg:max-h-none">
        <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {session.sampleApplication?.trim() || "No sample on this session."}
        </pre>
      </div>
    </div>
  );
}

interface BulkLayoutProps {
  session: SessionResponse;
  activeBulkJobId: string | null;
  canRunBulk: boolean;
  onSwitchToIterate: () => void;
}

function BulkLayout({ session, activeBulkJobId, canRunBulk, onSwitchToIterate }: BulkLayoutProps) {
  if (!canRunBulk) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm font-medium text-foreground">
          Iterate on a sample before running the full CSV
        </p>
        <p className="text-sm text-muted-foreground">
          Run at least one evaluation on a sample so you can verify the rubric. You can come back
          here and upload the CSV right after.
        </p>
        <Button type="button" variant="outline" onClick={onSwitchToIterate}>
          <Sparkles className="h-4 w-4" /> Go to iterate
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {activeBulkJobId ? (
        <BulkProgressView sessionId={session.id} jobId={activeBulkJobId} />
      ) : (
        <BulkUploadPanel sessionId={session.id} />
      )}
    </div>
  );
}
