"use client";

import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatDate } from "@/utilities/formatDate";

interface ApplicationInfoCardProps {
  referenceNumber: string;
  programName: string;
  lastSubmission?: string;
  deadline?: string;
  applicantEmail?: string;
  ownerAddress?: string;
  canViewApplicant: boolean;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function deriveApplicant(email?: string, ownerAddress?: string) {
  if (email) {
    const localPart = email.split("@")[0] || email;
    return { name: localPart, secondary: email, initial: localPart.charAt(0).toUpperCase() };
  }
  if (ownerAddress) {
    return {
      name: truncateAddress(ownerAddress),
      secondary: undefined,
      initial: ownerAddress.slice(2, 3).toUpperCase() || "?",
    };
  }
  return { name: "Anonymous", secondary: undefined, initial: "?" };
}

export function ApplicationInfoCard({
  referenceNumber,
  programName,
  lastSubmission,
  deadline,
  applicantEmail,
  ownerAddress,
  canViewApplicant,
}: ApplicationInfoCardProps) {
  const [copiedText, copy] = useCopyToClipboard();
  const isCopied = copiedText === referenceNumber;
  // The applicant identity is shown only to the applicant themselves and to
  // reviewers/admins. For everyone else the section is hidden entirely (rather
  // than shown as "Anonymous"); unauthorized viewers also receive no identity
  // data because the backend redacts it.
  const showApplicant = canViewApplicant && Boolean(applicantEmail || ownerAddress);
  const applicant = showApplicant ? deriveApplicant(applicantEmail, ownerAddress) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Application info
      </p>

      <dl className="divide-y divide-border">
        <div className="flex items-start justify-between gap-3 pb-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Application ID</dt>
          <dd className="flex items-center gap-2">
            <span className="font-mono text-xs text-foreground">{referenceNumber}</span>
            <button
              type="button"
              aria-label="Copy application ID"
              onClick={() => copy(referenceNumber, "Application ID copied")}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3 py-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Program</dt>
          <dd className="text-right text-[13px] font-medium text-foreground">{programName}</dd>
        </div>

        <div className="flex items-start justify-between gap-3 py-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Last submission</dt>
          <dd className="text-right text-[13px] font-medium text-foreground">
            {lastSubmission ? formatDate(lastSubmission) : "N/A"}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3 pt-3">
          <dt className="text-[13px] font-medium text-muted-foreground">Deadline</dt>
          <dd className="text-right text-[13px] font-medium text-foreground">
            {deadline ? formatDate(deadline) : "N/A"}
          </dd>
        </div>
      </dl>

      {showApplicant && applicant && (
        <>
          <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Applicant
          </p>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-primary))]/10 text-sm font-semibold text-[rgb(var(--color-primary-dark))]">
              {applicant.initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">
                {applicant.name}
              </div>
              {applicant.secondary && (
                <div className="truncate text-xs text-muted-foreground">{applicant.secondary}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
