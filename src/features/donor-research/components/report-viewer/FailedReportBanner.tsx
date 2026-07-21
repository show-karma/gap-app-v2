"use client";

import { AlertOctagon, Mail, RefreshCw } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import type { ResearchReportDetail } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";

interface FailedReportBannerProps {
  report: ResearchReportDetail;
}

const SUPPORT_MAILTO =
  "mailto:support@karmahq.xyz?subject=Donor%20Research%20%E2%80%94%20Higher%20Limits%20Request";

/**
 * Detailed failed-state UX for the report viewer (F5).
 *
 * Three branches based on the error message:
 *  - Rate-limit failures: surface a "request higher limits" mailto.
 *  - Compliance/timeout failures: encourage a fresh report with a CTA.
 *  - Anything else: generic retry guidance + raw error text.
 *
 * The Sentry digest, when surfaced through `error.digest` on the
 * route-level error boundary, isn't available here — this banner is
 * rendered inside the data path. We surface the report id so support
 * has something to grep on if the advisor reaches out.
 */
export function FailedReportBanner({ report }: FailedReportBannerProps) {
  const message = report.errorMessage || "";
  const isRateLimit = /rate.?limit|429|too many/i.test(message);
  const isTimeout = /timeout|deadline|timed.?out/i.test(message);

  return (
    <div
      className="overflow-hidden rounded-sf-card border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
      role="alert"
    >
      <div className="flex items-start gap-3 p-5">
        <AlertOctagon className="mt-0.5 h-5 w-5 flex-none text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
            This report didn't finish
          </h3>
          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            {isRateLimit
              ? "We weren't able to start the pipeline because the daily limit on this tier was reached."
              : isTimeout
                ? "The pipeline ran longer than the allowed window and didn't complete in time."
                : "The pipeline encountered an error. The criteria are saved — you can try again, or contact support if it keeps failing."}
          </p>
          {message ? (
            <details className="mt-3 text-xs text-red-800 dark:text-red-200">
              <summary className="cursor-pointer font-medium">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-red-300/50 bg-red-100/40 p-2 font-mono text-[11px] dark:border-red-900/60 dark:bg-red-950/60">
                {message}
              </pre>
            </details>
          ) : null}
          <p className="mt-3 text-xs text-red-700 dark:text-red-300">
            Report id <span className="font-mono">{report.id}</span>. Share this with support if you
            need help.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-red-300/60 bg-red-100/60 px-5 py-3 dark:border-red-900/60 dark:bg-red-950/60">
        <Link
          href={PAGES.DONOR_RESEARCH.INDEX}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900/60"
        >
          <RefreshCw className="h-4 w-4" />
          Start a new report
        </Link>
        {isRateLimit ? (
          <a
            href={SUPPORT_MAILTO}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-transparent px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-900/40"
          >
            <Mail className="h-4 w-4" />
            Contact us for higher limits
          </a>
        ) : (
          <a
            href={SUPPORT_MAILTO}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-transparent px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-900/40"
          >
            <Mail className="h-4 w-4" />
            Contact support
          </a>
        )}
      </div>
    </div>
  );
}
