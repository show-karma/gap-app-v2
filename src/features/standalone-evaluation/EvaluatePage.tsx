"use client";

import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreditBalanceBadge } from "./components/CreditBalanceBadge";
import { EvaluateWorkspace } from "./components/EvaluateWorkspace";
import { EvaluationSessionForm } from "./components/EvaluationSessionForm";
import { SessionListSidebar } from "./components/SessionListSidebar";
import { useSessions } from "./hooks/useEvaluationSessions";
import { standaloneEvaluationService } from "./services/standaloneEvaluationService";
import { useEvaluationDraftStore } from "./store/evaluationDraftStore";

type View = "form" | "workspace";

export function EvaluatePage() {
  const { ready, authenticated, login } = useAuth();
  const activeSessionId = useEvaluationDraftStore((s) => s.activeSessionId);
  const setActiveSessionId = useEvaluationDraftStore((s) => s.setActiveSessionId);
  const sessionsQuery = useSessions();

  // Initial view: workspace if we have an active session id, otherwise the form.
  const [view, setView] = useState<View>(activeSessionId ? "workspace" : "form");

  // Auto-select runs once per mount; "New session" flips this to keep the
  // form open after an explicit reset.
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (!authenticated) return;
    if (activeSessionId) return;
    if (didAutoSelectRef.current) return;
    const items = sessionsQuery.data?.items;
    if (items && items.length > 0) {
      didAutoSelectRef.current = true;
      setActiveSessionId(items[0].id);
      setView("workspace");
    }
  }, [authenticated, activeSessionId, sessionsQuery.data, setActiveSessionId]);

  useEffect(() => {
    if (activeSessionId) {
      setView("workspace");
    }
  }, [activeSessionId]);

  // Auto-download from completion-email links: /evaluate?session=&bulk-download=
  const searchParams = useSearchParams();
  const downloadSession = searchParams?.get("session");
  const downloadJobId = searchParams?.get("bulk-download");
  const autoDownloadKey =
    downloadSession && downloadJobId ? `${downloadSession}:${downloadJobId}` : null;
  const lastAutoDownloadKeyRef = useRef<string | null>(null);

  const autoDownloadMutation = useMutation<void, Error, { sessionId: string; jobId: string }>({
    mutationFn: async ({ sessionId, jobId }) => {
      const blob = await standaloneEvaluationService.downloadBulkResultCsv(sessionId, jobId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `bulk-evaluation-${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    },
    onSuccess: () => {
      toast.success("Results downloaded");
    },
    onError: (err) => {
      lastAutoDownloadKeyRef.current = null;
      toast.error(err.message || "Couldn't download results");
    },
  });

  useEffect(() => {
    if (!authenticated) return;
    if (!downloadSession || !downloadJobId || !autoDownloadKey) return;
    if (lastAutoDownloadKeyRef.current === autoDownloadKey) return;
    lastAutoDownloadKeyRef.current = autoDownloadKey;
    autoDownloadMutation.mutate({
      sessionId: downloadSession,
      jobId: downloadJobId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, downloadSession, downloadJobId, autoDownloadKey]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="space-y-4">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
          <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Evaluate Grant Applications</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered grant application evaluation. Sign in to create a session, iterate on your
            evaluation prompt, and bulk-process a CSV of applications.
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Evaluate Grant Applications</h1>
          <p className="text-sm text-muted-foreground">
            Configure your evaluation, iterate on a sample, then bulk-process your applications.
          </p>
        </div>
        <CreditBalanceBadge />
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <SessionListSidebar
          activeSessionId={activeSessionId}
          onSelect={(id) => {
            setActiveSessionId(id);
            setView("workspace");
          }}
          onCreateNew={() => {
            didAutoSelectRef.current = true;
            setActiveSessionId(null);
            setView("form");
          }}
        />

        <main className="flex-1 min-w-0">
          {view === "form" || !activeSessionId ? (
            <EvaluationSessionForm
              onCancel={
                (sessionsQuery.data?.items.length ?? 0) > 0 ? () => setView("workspace") : undefined
              }
            />
          ) : (
            <EvaluateWorkspace sessionId={activeSessionId} />
          )}
        </main>
      </div>
    </div>
  );
}
