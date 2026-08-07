"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { MilestoneAuthorityNotice } from "@/src/features/applications/components/MilestoneAuthorityNotice";
import { OffChainMilestoneRow } from "@/src/features/applications/components/OffChainMilestoneRow";
import { OnChainMilestoneRow } from "@/src/features/applications/components/OnChainMilestoneRow";
import { useApplicationInvoiceConfig } from "@/src/features/applications/hooks/use-application-invoice-config";
import { useMilestoneSubmissionAuthority } from "@/src/features/applications/hooks/use-milestone-submission-authority";
import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

// Narrow structural prop — the tab only needs the milestone-relevant
// fields. Accepts both the whitelabel `Application` and the admin
// `IFundingApplication` shapes; status is `string` so any enum union
// satisfies (the lifecycle check below only inspects "approved").
export interface MilestonesTabApplication {
  referenceNumber: string;
  projectUID?: string;
  status: string;
  milestoneStatuses?: MilestoneStatusEntry[];
}

// Stable key: prefer milestoneUID; fall back to fieldLabel:title for
// application-source slots not yet anchored on-chain (no UID).
function milestoneEntryKey(entry: MilestoneStatusEntry): string {
  return entry.milestoneUID ?? `${entry.source}:${entry.fieldLabel ?? ""}:${entry.title}`;
}

interface MilestonesTabProps {
  application: MilestonesTabApplication;
  isOwner: boolean;
  invoiceRequired?: boolean;
}

/**
 * Renders the milestone list for a funding application. The indexer
 * publishes a pre-merged, pre-deduped, pre-sorted `milestoneStatuses[]`
 * array on the application response — application-source entries
 * (authored on the form) AND project-source entries (inherited from
 * grant.milestones[]) live in the same list. We just iterate.
 */
export function MilestonesTab({ application, isOwner, invoiceRequired }: MilestonesTabProps) {
  // Always fire the invoice config query — `invoiceConfig.invoiceRequired`
  // is the authoritative per-grant flag (program.metadata can lag/be unset).
  // The optional `invoiceRequired` prop only acts as a hint to skip the
  // query for callers that *know* it's never required.
  const { data: invoiceConfig, isLoading: isInvoiceConfigLoading } = useApplicationInvoiceConfig(
    application.referenceNumber,
    { enabled: invoiceRequired !== false }
  );

  // Being the APPLICANT is not enough to submit a completion — the indexer
  // authorizes the resulting attestation against PROJECT authority; see the
  // hook for why both signals are required.
  const authority = useMilestoneSubmissionAuthority({
    isApplicant: isOwner,
    projectUID: application.projectUID,
  });
  const canSubmitCompletion = authority.status === "authorized";

  const showInvoice = !!invoiceConfig?.invoiceRequired && !!invoiceConfig?.grantUID;
  const milestoneInvoices = invoiceConfig?.milestoneInvoices ?? [];

  const entries = application.milestoneStatuses ?? [];

  if (entries.length === 0) {
    // Lifecycle: status flips to "approved" → project gets created →
    // grant is attested on-chain → milestones are attested. There's a
    // transient window where status="approved" but milestoneStatuses
    // is still empty — "No milestones defined" is wrong copy for that
    // window because it implies a permanent absence.
    const isApprovedPipelinePending = application.status.toLowerCase() === "approved";
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground">
          {isApprovedPipelinePending
            ? "Setting up milestones… On-chain attestations land within a few minutes of approval."
            : "No milestones defined for this application."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Milestones</h2>
      </div>
      {authority.status === "denied" && <MilestoneAuthorityNotice variant="denied" />}
      {authority.status === "unverified" && (
        <MilestoneAuthorityNotice variant="unverified" onRetry={authority.retry} />
      )}
      <div className="space-y-3 p-5">
        {entries.map((entry) => {
          const key = milestoneEntryKey(entry);

          // Tri-state rule: while authorization resolves, render a skeleton —
          // neither the affordance nor a denial.
          if (authority.status === "resolving") {
            return (
              <Skeleton key={key} data-testid="milestone-row-skeleton" className="h-16 w-full" />
            );
          }

          if (entry.source === "application") {
            // Prefer milestoneUID matching when both sides have one; same-title
            // milestones are common (e.g. "Milestone 2", "Milestone 2") and a
            // title-only match would attach the wrong invoice. Fall back to
            // title for legacy invoice rows that predate UID anchoring.
            const existingInvoice = milestoneInvoices.find((inv) => {
              if (entry.milestoneUID && inv.milestoneUID) {
                return inv.milestoneUID === entry.milestoneUID;
              }
              return inv.milestoneLabel === entry.title;
            });
            return (
              <OffChainMilestoneRow
                key={key}
                entry={entry}
                referenceNumber={application.referenceNumber}
                isEditable={canSubmitCompletion}
                showInvoice={showInvoice}
                existingInvoice={existingInvoice}
                isInvoiceConfigLoading={isInvoiceConfigLoading}
              />
            );
          }

          // Project-source row — requires projectUID for the "View on project
          // page" link. The indexer only emits project-source entries when
          // application.projectUID is set, so this is defensive.
          if (!application.projectUID) return null;
          return (
            <OnChainMilestoneRow
              key={key}
              entry={entry}
              referenceNumber={application.referenceNumber}
              isEditable={canSubmitCompletion}
              projectUid={application.projectUID}
            />
          );
        })}
      </div>
    </div>
  );
}
