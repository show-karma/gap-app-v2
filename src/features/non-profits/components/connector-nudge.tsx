"use client";

/**
 * ConnectorNudge — ported from grant-atlas
 * features/grant-atlas/components/research-workbench/connector-nudge.tsx.
 *
 * CTA prompting users to connect the agent to Claude/ChatGPT. Two variants:
 *
 * - `inline` (default): the original dismissable banner in the conversation
 *   flow. Dismissal is persisted to sessionStorage. The workbench only renders
 *   it below `xl`, where the right rail is hidden.
 * - `rail`: a compact card for the search workbench's right rail. Deliberately
 *   not dismissable — keeping the connector permanently in view is the whole
 *   point of moving it out of the conversation, and in the rail it never
 *   competes with the answer for vertical space.
 *
 * Uses CSS transitions only (no motion).
 */

import { ArrowUpRight, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const DISMISS_KEY = "np-connector-nudge-dismissed";

// The brand marks are single-path black SVGs, so `dark:invert` is what makes
// them legible on a dark card (same treatment as the /mcp connect page).
const CONNECT_TARGETS = [
  {
    label: "Add to Claude",
    href: NON_PROFITS_PAGES.CONNECT_CLAUDE,
    logo: "/images/mcp/claude.svg",
  },
  {
    label: "Add to ChatGPT",
    href: NON_PROFITS_PAGES.CONNECT_CHATGPT,
    logo: "/images/mcp/openai.svg",
  },
] as const;

const LINK_BASE =
  "inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800";

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

/**
 * Setup guides always open in a new tab so the user never loses the
 * conversation they're in the middle of.
 */
function ConnectLink({
  href,
  logo,
  label,
  className,
}: {
  href: string;
  logo: string;
  label: string;
  className: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      <Image
        src={logo}
        alt=""
        width={14}
        height={14}
        aria-hidden="true"
        className="size-3.5 shrink-0 dark:invert"
      />
      {label}
      <ArrowUpRight className="size-3" />
    </a>
  );
}

export function ConnectorNudge({ variant = "inline" }: { variant?: "inline" | "rail" }) {
  const [hidden, setHidden] = useState(true);

  // Avoid SSR/hydration mismatch — only show after mount, only if not dismissed.
  // The rail variant carries no dismiss affordance, so it always shows.
  useEffect(() => {
    if (variant === "rail" || !isDismissed()) setHidden(false);
  }, [variant]);

  if (hidden) return null;

  if (variant === "rail") {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-4 dark:border-zinc-800 dark:from-amber-900/10 dark:via-zinc-900 dark:to-blue-900/10">
        <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Sparkles className="size-4" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Do this in Claude or ChatGPT
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Run the same prospecting agent inside the AI tool you already use. About 60 seconds to
          connect — no new login.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {CONNECT_TARGETS.map((target) => (
            <ConnectLink
              key={target.href}
              href={target.href}
              logo={target.logo}
              label={target.label}
              className={`${LINK_BASE} justify-center`}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleDismiss = () => {
    persistDismiss();
    setHidden(true);
  };

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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CONNECT_TARGETS.map((target) => (
              <ConnectLink
                key={target.href}
                href={target.href}
                logo={target.logo}
                label={target.label}
                className={LINK_BASE}
              />
            ))}
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Opens in a new tab</span>
          </div>
        </div>
      </div>
    </div>
  );
}
