"use client";

/**
 * ConnectorNudge — ported from grant-atlas
 * features/grant-atlas/components/research-workbench/connector-nudge.tsx.
 *
 * Dismissable CTA banner prompting users to connect the agent to Claude/ChatGPT.
 * Uses CSS transitions only (no motion). Dismissal is persisted to sessionStorage.
 */

import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "np-connector-nudge-dismissed";

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // sessionStorage unavailable — ignore
  }
}

export function ConnectorNudge() {
  const [hidden, setHidden] = useState(true);

  // Avoid SSR/hydration mismatch — only show after mount, only if not dismissed.
  useEffect(() => {
    if (!isDismissed()) setHidden(false);
  }, []);

  if (hidden) return null;

  const handleDismiss = () => {
    persistDismiss();
    setHidden(true);
  };

  // Connector setup section lives on the landing page.
  const setupHref = "/non-profits/find-funders/connect/claude";

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 dark:border-zinc-800 dark:from-amber-900/10 dark:via-zinc-900 dark:to-blue-900/10">
      <div className="flex items-start gap-4 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Take this agent with you to Claude or ChatGPT
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Use the same prospecting agent inside the AI tool you already use. About 60 seconds
                to connect — no new login, no new dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={setupHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Add to Claude
              <ArrowUpRight className="size-3" />
            </a>
            <a
              href={setupHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Add to ChatGPT
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
