"use client";

import { ArrowLeft } from "lucide-react";
import pluralize from "pluralize";
import { Link } from "@/src/components/navigation/Link";
import type { ResearchReportDetail } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";
import { StatusBadge } from "../report-list/StatusBadge";
import { ShareTokenControls } from "../report-viewer/ShareTokenControls";
import { briefDisplay, briefProse } from "./fonts";

interface MastheadProps {
  report: ResearchReportDetail;
  candidatesCount: number;
  surfacedCount: number;
  isTerminal: boolean;
  /**
   * "shared" hides advisor-only affordances (the dashboard back-link and the
   * share-token controls) that a donor can't use, while keeping the masthead
   * visually identical otherwise.
   */
  variant?: "advisor" | "shared";
}

/**
 * The brief's masthead. Reads as the cover of a research memo: a
 * Karma · Research Brief eyebrow, a serif-spaced issue identifier
 * and date on the same line, the headline at editorial scale, and
 * a single byline sentence beneath. Share controls hang off the
 * right edge so the share affordance is the first thing a sender
 * sees.
 */
export function Masthead({
  report,
  candidatesCount,
  surfacedCount,
  isTerminal,
  variant = "advisor",
}: MastheadProps) {
  const isShared = variant === "shared";
  const issuedAt = report.fastCompletedAt ?? report.completedAt ?? report.createdAt;
  const issuedLabel = formatIssueDate(issuedAt);
  const updatedAt = report.completedAt ?? report.fastCompletedAt ?? report.createdAt;
  // Only surface "Updated" when a later completion (e.g. deep enrichment) moved the
  // date past the issue date — otherwise the same day would render twice.
  const updatedLabel = formatIssueDate(updatedAt);
  const showUpdated = updatedLabel !== "—" && updatedLabel !== issuedLabel;
  const issueNumber = `No. ${report.id.slice(0, 6).toUpperCase()}`;

  return (
    <header
      className="mb-14 grid grid-cols-1 gap-8 sm:mb-20 sm:grid-cols-[1fr_auto] sm:gap-12"
      data-section="masthead"
    >
      <div className="min-w-0">
        {isShared ? null : (
          <Link
            href={PAGES.DONOR_RESEARCH.INDEX}
            className={`${briefDisplay.className} inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-foreground`}
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Research dashboard
          </Link>
        )}

        <div
          className={`${briefDisplay.className} mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.34em] text-muted-foreground`}
        >
          <span className="text-foreground/80">Karma · Research Brief</span>
          <Bullet />
          <span className="tabular-nums">{issueNumber}</span>
          <Bullet />
          <span className="text-brand-emphasis dark:text-brand-subtle">Issued {issuedLabel}</span>
          {showUpdated ? (
            <>
              <Bullet />
              <span>Updated {updatedLabel}</span>
            </>
          ) : null}
        </div>

        <h1
          className={`${briefDisplay.className} mt-5 max-w-[18ch] text-balance text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.025em] text-foreground`}
        >
          {headline({
            considered: candidatesCount,
            surfaced: surfacedCount,
            mode: report.mode,
            status: report.status,
          })}
        </h1>

        <p
          className={`${briefProse.className} mt-6 max-w-[58ch] text-[1.0625rem] leading-[1.55] text-foreground/80`}
        >
          {byline({
            considered: candidatesCount,
            surfaced: surfacedCount,
            mode: report.mode,
            status: report.status,
          })}
        </p>

        <div className="mt-6 inline-flex items-center gap-3">
          <StatusBadge status={report.status} />
        </div>
      </div>

      {isTerminal && !isShared ? (
        <div className="sm:justify-self-end">
          <ShareTokenControls
            reportId={report.id}
            hasShareToken={report.hasShareToken}
            shareToken={report.shareToken}
            shareTokenExpiresAt={report.shareTokenExpiresAt}
          />
        </div>
      ) : null}
    </header>
  );
}

function Bullet() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  );
}

function formatIssueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface HeadlineInputs {
  considered: number;
  surfaced: number;
  mode: ResearchReportDetail["mode"];
  status: ResearchReportDetail["status"];
}

function headline({ considered, surfaced, status }: HeadlineInputs): string {
  const stillRunning =
    status === "pending" ||
    status === "running_fast" ||
    status === "enriching" ||
    status === "re_enriching";

  if (considered === 0 && stillRunning) return "Compiling the candidate pool";
  if (considered === 0) return "No candidates emerged from the search";
  if (surfaced === 0 && stillRunning) return "Vetting candidates against your criteria";
  if (surfaced === 0) return "No candidate cleared the qualifying bar";
  if (surfaced === 1) return "One nonprofit worth your attention";
  if (surfaced === 2) return "Two nonprofits worth your attention";
  return `${surfaced} nonprofits worth your attention`;
}

function byline({ considered, surfaced, mode, status }: HeadlineInputs): string {
  const verb = mode === "deep" ? "Deep research across" : "A first-pass scan of";
  const stillRunning =
    status === "pending" ||
    status === "running_fast" ||
    status === "enriching" ||
    status === "re_enriching";

  if (considered === 0) {
    return stillRunning
      ? "We're assembling the pool against your stated cause, geography, and amount. The brief will populate in place as candidates clear each gate."
      : "No candidates surfaced from the criteria you set. Broaden the cause or geography and we'll run the search again.";
  }

  const orgs = pluralize("organization", considered);
  if (surfaced === 0) {
    return `${verb} ${considered} ${orgs}; none cleared the compliance and activity gates. The full pool sits below for transparency, with the disqualifying reason on each row.`;
  }

  const ratio = `${surfaced} of ${considered}`;
  return `${verb} ${considered} ${orgs}. ${ratio} surfaced after compliance verification, recency weighting, and mission match — each is profiled below in order of composite fit.`;
}
