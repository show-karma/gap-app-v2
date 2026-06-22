"use client";

import { AlertTriangle } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ApplicationViewBoundaryProps {
  children: ReactNode;
}

/**
 * Recovery boundary for the streamed application view subtree.
 *
 * React 19's stream/Suspense-resume runtime ($RS) crashes with
 * "Cannot read properties of null (reading 'parentNode')" when an EXTERNAL DOM
 * mutator (Google Translate / in-browser translate, aggressive extensions)
 * removes a React-owned node between commits. Without a boundary this surfaces
 * as an uncaught top-level error and white-screens the page.
 *
 * This wrapper:
 *  - catches the transient reconciliation crash and offers a one-click reload
 *    so the subtree recovers instead of throwing,
 *  - marks the subtree `translate="no"` (+ `notranslate`) so machine
 *    translation does not rewrite the React-owned text nodes in the streamed
 *    content — the standard Google-Translate-vs-React mitigation.
 */
export function ApplicationViewBoundary({ children }: ApplicationViewBoundaryProps) {
  // `key` remounts the children subtree on recovery so a clean reconciliation
  // pass replaces the DOM that the external mutator corrupted.
  const [recoveryKey, setRecoveryKey] = useState(0);

  const handleRecover = useCallback(() => {
    setRecoveryKey((key) => key + 1);
  }, []);

  const fallback = (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center"
      data-testid="application-view-recovery"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">This view needs to reload</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The page was interrupted while loading — this can happen with browser translation or
          extensions. Reload to continue viewing the application.
        </p>
      </div>
      <button
        type="button"
        onClick={handleRecover}
        className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Reload view
      </button>
    </div>
  );

  return (
    <div className="notranslate" translate="no">
      <ErrorBoundary key={recoveryKey} fallback={fallback}>
        {children}
      </ErrorBoundary>
    </div>
  );
}
