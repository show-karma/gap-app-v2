"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useProjectGrantMilestones } from "@/hooks/useProjectGrantMilestones";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import {
  type OffChainInvoiceSupport,
  OffChainMilestoneRow,
} from "@/src/features/applications/components/OffChainMilestoneRow";
import {
  isOnChainMilestoneCompleted,
  OnChainMilestoneRow,
} from "@/src/features/applications/components/OnChainMilestoneRow";
import { useApplicationInvoiceConfig } from "@/src/features/applications/hooks/use-application-invoice-config";
import { useMilestoneCompletions } from "@/src/features/applications/hooks/use-milestone-completions";
import { buildPositionalCompletionMap } from "@/src/features/applications/lib/milestone-utils";
import type { Application, MilestoneData } from "@/types/whitelabel-entities";

interface MilestonesTabProps {
  application: Application;
  isOwner: boolean;
  invoiceRequired?: boolean;
}

type UnifiedItem =
  | {
      source: "offchain";
      key: string;
      fieldLabel: string;
      milestone: MilestoneData;
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

function isMilestoneArray(value: unknown): value is MilestoneData[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    "title" in value[0]
  );
}

const normalizeTitle = (title: string) => title.trim().toLowerCase();

const parseDueDate = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

export function MilestonesTab({ application, isOwner, invoiceRequired }: MilestonesTabProps) {
  const referenceNumber = application.referenceNumber;
  const projectUID = application.projectUID;
  const programId = application.programId;

  const milestoneFields = useMemo(
    () =>
      Object.entries(application.applicationData).filter(([, v]) => isMilestoneArray(v)) as [
        string,
        MilestoneData[],
      ][],
    [application.applicationData]
  );

  const offChainTitles = useMemo(() => {
    const set = new Set<string>();
    for (const [, ms] of milestoneFields) {
      for (const m of ms) set.add(normalizeTitle(m.title));
    }
    return set;
  }, [milestoneFields]);

  const {
    completions,
    isLoading: isCompletionsLoading,
    createCompletion,
    updateCompletion,
    isCreating,
    isUpdating,
  } = useMilestoneCompletions({ referenceNumber });

  const { data: invoiceConfig, isLoading: isInvoiceConfigLoading } = useApplicationInvoiceConfig(
    referenceNumber,
    { enabled: !!invoiceRequired }
  );

  const canShowOnChain = !!projectUID && !!programId;
  const {
    data: onChainData,
    isLoading: isOnChainLoading,
    error: onChainError,
    refetch: refetchOnChain,
  } = useProjectGrantMilestones(
    canShowOnChain ? (projectUID as string) : "",
    canShowOnChain ? programId : ""
  );

  const completionMaps = useMemo(() => {
    const out = new Map<string, Map<number, (typeof completions)[number] | null>>();
    for (const [fieldLabel, ms] of milestoneFields) {
      out.set(fieldLabel, buildPositionalCompletionMap(ms, completions, fieldLabel));
    }
    return out;
  }, [milestoneFields, completions]);

  const unified: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];

    for (const [fieldLabel, ms] of milestoneFields) {
      const map = completionMaps.get(fieldLabel);
      ms.forEach((milestone, index) => {
        const completion = map?.get(index) ?? null;
        items.push({
          source: "offchain",
          key: `off:${fieldLabel}:${milestone.title}:${index}`,
          fieldLabel,
          milestone,
          dueMs: parseDueDate(milestone.dueDate),
          isDone: !!completion?.isVerified,
        });
      });
    }

    const onChainList = onChainData?.grantMilestones ?? [];
    for (const m of onChainList) {
      if (offChainTitles.has(normalizeTitle(m.title))) continue;
      items.push({
        source: "onchain",
        key: `on:${m.uid}`,
        milestone: m,
        dueMs: parseDueDate(m.dueDate),
        isDone: isOnChainMilestoneCompleted(m),
      });
    }

    return items.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return a.dueMs - b.dueMs;
    });
  }, [milestoneFields, completionMaps, onChainData, offChainTitles]);

  const hasAnythingToShow = unified.length > 0;
  const isFetching = isCompletionsLoading || (canShowOnChain && isOnChainLoading);

  if (!hasAnythingToShow && !isFetching && !onChainError) {
    return (
      <div className="rounded-xl border border-border p-6">
        <p className="text-muted-foreground">No milestones defined for this application.</p>
      </div>
    );
  }

  const grantUID = invoiceConfig?.grantUID;
  const milestoneInvoices = invoiceConfig?.milestoneInvoices ?? [];
  const buildInvoiceSupport = (milestoneTitle: string): OffChainInvoiceSupport | undefined => {
    if (!invoiceRequired) return undefined;
    return {
      enabled: !!invoiceConfig?.invoiceRequired,
      isLoading: isInvoiceConfigLoading,
      grantUID,
      existing: milestoneInvoices.find((inv) => inv.milestoneLabel === milestoneTitle),
    };
  };

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-xl font-semibold text-foreground">Milestones</h2>
      </div>
      <div className="p-6 space-y-3">
        {isFetching && unified.length === 0 && (
          <div aria-busy="true" aria-live="polite" className="space-y-3">
            <div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
            <div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
          </div>
        )}

        {onChainError && unified.length === 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load on-chain milestones.</p>
            <Button size="sm" variant="outline" onClick={() => refetchOnChain()}>
              Retry
            </Button>
          </div>
        )}

        {unified.map((item) => {
          if (item.source === "offchain") {
            const map = completionMaps.get(item.fieldLabel);
            // Find positional index of this milestone within the field group.
            const fieldMilestones =
              milestoneFields.find(([label]) => label === item.fieldLabel)?.[1] ?? [];
            const positionalIndex = fieldMilestones.indexOf(item.milestone);
            const completion = positionalIndex >= 0 ? (map?.get(positionalIndex) ?? null) : null;
            return (
              <OffChainMilestoneRow
                key={item.key}
                milestone={item.milestone}
                fieldLabel={item.fieldLabel}
                referenceNumber={referenceNumber}
                isEditable={isOwner}
                completion={completion}
                invoiceSupport={buildInvoiceSupport(item.milestone.title)}
                onCreate={(payload, callbacks) => createCompletion(payload, callbacks)}
                onUpdate={(payload, callbacks) => updateCompletion(payload, callbacks)}
                isCreating={isCreating}
                isUpdating={isUpdating}
              />
            );
          }
          return (
            <OnChainMilestoneRow
              key={item.key}
              milestone={item.milestone}
              projectUID={projectUID as string}
              programId={programId}
              isEditable={isOwner}
            />
          );
        })}
      </div>
    </div>
  );
}
