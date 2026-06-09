import { memo } from "react";
import type { ResearchReportCandidate } from "@/types/donor-research";

interface SharedCandidateCardProps {
  candidate: ResearchReportCandidate;
  variant: "one-pager" | "detail";
}

const FRIENDLY_STATE_LABEL: Record<string, string> = {
  verified: "State registration verified",
  suspended: "State registration suspended",
  revoked: "State registration revoked",
  not_verified: "State registration: not checked for this state",
  data_not_yet_indexed: "State registration data: not yet available for this filing",
};

const FRIENDLY_VERDICT: Record<string, string> = {
  verified: "Verified",
  partial: "Mostly verified",
  flagged: "Some compliance gaps",
  disqualified: "Excluded — compliance gate",
};

/**
 * Donor-facing candidate card (U14).
 *
 * Differs from the advisor `CandidateCard` (U13c):
 *  - No raw score numbers (donors see "Verified", not "0.87 compliance").
 *  - No action buttons.
 *  - Compliance verdict + state-registration status rendered in plain
 *    English via the lookup tables above.
 *  - One-pager text gets prominent display; the detail view shows the
 *    full reasoning only when the donor opens the disclosure.
 */
export const SharedCandidateCard = memo(function SharedCandidateCard({
  candidate,
  variant,
}: SharedCandidateCardProps) {
  const stateLabel = FRIENDLY_STATE_LABEL[candidate.stateRegistrationStatus] ?? null;
  const verdict = FRIENDLY_VERDICT[candidate.complianceVerdict] ?? candidate.complianceVerdict;

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="mb-2">
        <h3 className="text-sm font-semibold">
          {candidate.ein ? `EIN ${formatEin(candidate.ein)}` : "EIN unavailable"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {verdict}
          {stateLabel ? ` · ${stateLabel}` : ""}
        </p>
      </header>

      {variant === "one-pager" && candidate.onePagerText ? (
        <p className="rounded-md bg-muted/40 p-3 text-sm">{candidate.onePagerText}</p>
      ) : (
        candidate.reasoningSummary && <p className="text-sm">{candidate.reasoningSummary}</p>
      )}

      {variant === "detail" && candidate.detailedText ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            More about this organization
          </summary>
          <p className="mt-2 whitespace-pre-line text-sm">{candidate.detailedText}</p>
        </details>
      ) : null}
    </article>
  );
});

SharedCandidateCard.displayName = "SharedCandidateCard";

function formatEin(ein: string): string {
  const digits = ein.replace(/[^0-9]/g, "");
  if (digits.length !== 9) return ein;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}
