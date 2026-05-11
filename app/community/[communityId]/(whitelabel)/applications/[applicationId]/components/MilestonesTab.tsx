"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { useApplicationInvoiceConfig } from "@/src/features/applications/hooks/use-application-invoice-config";
import { OffChainMilestoneRow } from "@/src/features/applications/components/OffChainMilestoneRow";
import { OnChainMilestoneRow } from "@/src/features/applications/components/OnChainMilestoneRow";
import {
  isMilestoneCompleted,
  isMilestoneVerified,
} from "@/src/features/applications/lib/milestone-status";
import type {
  Application,
  MilestoneData,
  MilestoneStatusEntry,
} from "@/types/whitelabel-entities";

interface MilestonesTabProps {
  application: Application;
  isOwner: boolean;
  invoiceRequired?: boolean;
}

function isMilestoneArray(value: unknown): value is MilestoneData[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    "title" in value[0]
  );
}

function parseDueMs(dueDate: string | undefined): number {
  if (!dueDate) return Number.POSITIVE_INFINITY;
  const ms = new Date(dueDate).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function isOnChainMilestoneDone(m: GrantMilestoneWithCompletion): boolean {
  return (
    !!m.completionDetails ||
    !!m.verificationDetails ||
    m.status === "completed" ||
    m.status === "verified"
  );
}

type UnifiedItem =
  | {
      source: "offchain";
      key: string;
      fieldLabel: string;
      milestone: MilestoneData;
      statusEntry?: MilestoneStatusEntry;
      dueMs: number;
      isDone: boolean;
    }
  | {
      source: "onchain";
      key: string;
      milestone: GrantMilestoneWithCompletion;
      dueMs: number;
      isDone: boolean;
    };

export function MilestonesTab({ application, isOwner, invoiceRequired }: MilestonesTabProps) {
  const { projectUID, programId } = application;

  const {
    data: onChainData,
    isLoading: isOnChainLoading,
    error: onChainError,
    refetch: refetchOnChain,
  } = useProjectGrantMilestones(projectUID ?? "", programId ?? "");

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

  const statusByUID = useMemo(() => {
    const map = new Map<string, MilestoneStatusEntry>();
    for (const entry of application.milestoneStatuses ?? []) {
      map.set(entry.milestoneUID, entry);
    }
    return map;
  }, [application.milestoneStatuses]);

  const milestoneFields = useMemo(
    () =>
      Object.entries(application.applicationData).filter(([_, value]) =>
        isMilestoneArray(value)
      ) as [string, MilestoneData[]][],
    [application.applicationData]
  );

  const unified = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Off-chain rows from applicationData
    const offChainUIDs = new Set<string>();
    for (const [fieldLabel, list] of milestoneFields) {
      list.forEach((milestone, index) => {
        const statusEntry = milestone.milestoneUID
          ? statusByUID.get(milestone.milestoneUID)
          : undefined;
        const isDone =
          isMilestoneVerified(statusEntry) || isMilestoneCompleted(statusEntry);
        items.push({
          source: "offchain",
          // Stable across renders: prefer the on-chain UID, fall back to a
          // positional sentinel within the field so duplicate titles don't
          // collide.
          key: milestone.milestoneUID
            ? `off:${milestone.milestoneUID}`
            : `off:${fieldLabel}:${index}`,
          fieldLabel,
          milestone,
          statusEntry,
          dueMs: parseDueMs(milestone.dueDate),
          isDone,
        });
        if (milestone.milestoneUID) offChainUIDs.add(milestone.milestoneUID);
      });
    }

    // On-chain rows: skip only when the same milestone is already represented
    // off-chain BY UID. We deliberately don't fall back to a title match
    // because real projects use repeated titles ("Milestone 2", "Milestone 2")
    // and a title-based filter would silently drop the second one. Submitted
    // milestones always get their milestoneUID written back to applicationData,
    // so UID-only dedup is sufficient.
    const grantMilestones = onChainData?.grantMilestones ?? [];
    const grantUID = onChainData?.grant?.uid;
    if (grantUID) {
      for (const m of grantMilestones) {
        if (offChainUIDs.has(m.uid)) continue;
        items.push({
          source: "onchain",
          key: `on:${m.uid}`,
          milestone: m,
          dueMs: parseDueMs(m.dueDate),
          isDone: isOnChainMilestoneDone(m),
        });
      }
    }

    items.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return a.dueMs - b.dueMs;
    });

    return items;
  }, [milestoneFields, statusByUID, onChainData]);

  const grantUID = onChainData?.grant?.uid;
  const hasNothing = unified.length === 0;

  // Full-card empty state — only when there's truly nothing to show AND
  // we're not still fetching / haven't errored. Loading and error states
  // are surfaced as non-blocking banners below so off-chain rows stay
  // visible while the on-chain side is in flight or has failed.
  if (hasNothing && !isOnChainLoading && !onChainError) {
    return (
      <div className="rounded-xl border border-border p-6">
        <p className="text-muted-foreground">No milestones defined for this application.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-xl font-semibold text-foreground">Milestones</h2>
      </div>
      <div className="p-6 space-y-3">
        {isOnChainLoading && (
          <div
            className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-3"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Loading on-chain milestones from the project…
              </p>
            </div>
          </div>
        )}
        {onChainError && (
          <div
            className="rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-3"
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Couldn&apos;t load on-chain milestones for this application.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetchOnChain()}>
                Retry
              </Button>
            </div>
          </div>
        )}
        {hasNothing && (
          <p className="text-muted-foreground text-sm">
            No milestones defined for this application yet.
          </p>
        )}
        {unified.map((item) => {
          if (item.source === "offchain") {
            const existingInvoice = milestoneInvoices.find(
              (inv) => inv.milestoneLabel === item.milestone.title
            );
            return (
              <OffChainMilestoneRow
                key={item.key}
                milestone={item.milestone}
                fieldLabel={item.fieldLabel}
                referenceNumber={application.referenceNumber}
                isEditable={isOwner}
                statusEntry={item.statusEntry}
                showInvoice={showInvoice}
                existingInvoice={existingInvoice}
                isInvoiceConfigLoading={isInvoiceConfigLoading}
                projectUid={projectUID}
                programId={programId}
              />
            );
          }
          // Pure on-chain row — only renders when we resolved a grant for
          // this program. Skipping silently if `grantUID` is missing keeps
          // the UI honest (we'd have nothing to attest against).
          if (!grantUID || !projectUID || !programId) return null;
          return (
            <OnChainMilestoneRow
              key={item.key}
              milestone={item.milestone}
              referenceNumber={application.referenceNumber}
              isEditable={isOwner}
              projectUid={projectUID}
              programId={programId}
              grantUID={grantUID}
            />
          );
        })}
      </div>
    </div>
  );
}
