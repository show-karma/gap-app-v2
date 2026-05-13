"use client";

import { OffChainMilestoneRow } from "@/src/features/applications/components/OffChainMilestoneRow";
import { OnChainMilestoneRow } from "@/src/features/applications/components/OnChainMilestoneRow";
import { useApplicationInvoiceConfig } from "@/src/features/applications/hooks/use-application-invoice-config";
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
      <div className="rounded-xl border border-border p-6">
        <p className="text-muted-foreground">
          {isApprovedPipelinePending
            ? "Setting up milestones… On-chain attestations land within a few minutes of approval."
            : "No milestones defined for this application."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-xl font-semibold text-foreground">Milestones</h2>
      </div>
      <div className="p-6 space-y-3">
        {entries.map((entry) => {
          // Stable key: prefer milestoneUID; fall back to fieldLabel:title
          // for application-source slots that haven't been anchored on-chain
          // yet (no UID).
          const key =
            entry.milestoneUID ?? `${entry.source}:${entry.fieldLabel ?? ""}:${entry.title}`;

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
                isEditable={isOwner}
                showInvoice={showInvoice}
                existingInvoice={existingInvoice}
                isInvoiceConfigLoading={isInvoiceConfigLoading}
              />
            );
          }

          // Project-source row — requires projectUID for the "View on
          // project page" link. The indexer only emits project-source
          // entries when application.projectUID is set, so this is
          // defensive rather than load-bearing.
          if (!application.projectUID) return null;
          return (
            <OnChainMilestoneRow
              key={key}
              entry={entry}
              referenceNumber={application.referenceNumber}
              isEditable={isOwner}
              projectUid={application.projectUID}
            />
          );
        })}
      </div>
    </div>
  );
}
