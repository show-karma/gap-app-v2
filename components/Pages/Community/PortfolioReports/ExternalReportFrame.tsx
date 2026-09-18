"use client";

import { memo } from "react";

interface Props {
  /** Full HTML document as the external agent produced it. Rendered verbatim. */
  html: string;
  /** Accessible name for the frame. */
  title: string;
}

/**
 * Renders a report saved from an external agent (via MCP) exactly as it was
 * produced: the document goes into an `<iframe srcDoc>` untouched — no Karma
 * stylesheet, no sanitising rewrite, no `body` → `:host` mapping. Isolation
 * comes from the sandbox attribute instead: with an empty `sandbox=""` the
 * document gets a unique opaque origin and cannot run scripts, submit forms,
 * open popups or reach the parent page, so untrusted markup stays inert.
 *
 * Height: the sandbox also blocks the parent from reading the document's
 * scrollHeight, so the usual "measure and grow" trick is off the table. The
 * frame instead takes the full viewport height (`h-screen`, with a tall
 * `min-h` floor so it never collapses in short viewports) and lets the
 * document scroll inside it. That keeps long reports readable without a
 * cramped box while avoiding a fragile cross-origin measurement.
 */
function ExternalReportFrameComponent({ html, title }: Props) {
  if (!html.trim()) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        This report has no content yet.
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      sandbox=""
      title={title}
      className="block h-screen min-h-[48rem] w-full border-0 bg-white"
      data-testid="external-report-frame"
    />
  );
}

export const ExternalReportFrame = memo(ExternalReportFrameComponent);
