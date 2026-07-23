"use client";

import pluralize from "pluralize";
import type { ResearchReportDetail } from "@/types/donor-research";
import { ShareTokenControls } from "../report-viewer/ShareTokenControls";
import { WeightsPanel } from "../report-viewer/WeightsPanel";

interface MastheadProps {
  report: ResearchReportDetail;
  candidatesCount: number;
  surfacedCount: number;
  isTerminal: boolean;
  /**
   * "advisor" (the report owner) renders in-shell — `DonorResearchShell`'s
   * left rail already carries the "Reports" back-link, so the header
   * itself needs none — plus the weights/share-token controls (owner-only
   * writes). Navigation breadcrumbs live in the authenticated view wrapper;
   * the shared document gets none.
   */
  variant?: "advisor" | "shared" | "staff";
  /**
   * Shows the weights/share-token controls. Defaults to owner-only
   * (`variant === "advisor"`); the authenticated view passes `true` for
   * staff as well.
   */
  canManageReport?: boolean;
}

/**
 * Report header (redesign spec 2.3): the dynamic headline/byline (kept
 * verbatim from the editorial brief — `headline()` / `byline()` below) and
 * the Adjust ranking + Share actions (owner and staff). Report number,
 * status, mode, and issue date live in the summary immediately below.
 */
export function Masthead({
  report,
  candidatesCount,
  surfacedCount,
  isTerminal,
  variant = "advisor",
  canManageReport,
}: MastheadProps) {
  const showManageControls = canManageReport ?? variant === "advisor";
  return (
    <header
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
      data-section="masthead"
    >
      <div className="min-w-0 flex-1">
        <h1 className="max-w-[42ch] text-balance text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.02em] text-sf-heading sm:text-[1.875rem]">
          {headline({
            considered: candidatesCount,
            surfaced: surfacedCount,
            mode: report.mode,
            status: report.status,
          })}
        </h1>

        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.55] text-sf-muted">
          {byline({
            considered: candidatesCount,
            surfaced: surfacedCount,
            mode: report.mode,
            status: report.status,
          })}
        </p>
      </div>

      {isTerminal && showManageControls ? (
        <div className="flex flex-none flex-wrap items-start gap-2">
          {report.weights && report.candidates.length > 0 ? <WeightsPanel report={report} /> : null}
          <ShareTokenControls
            hasShareToken={report.hasShareToken}
            reportId={report.id}
            shareToken={report.shareToken}
            shareTokenExpiresAt={report.shareTokenExpiresAt}
          />
        </div>
      ) : null}
    </header>
  );
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
