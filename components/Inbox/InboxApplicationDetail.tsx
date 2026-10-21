"use client";

import pluralize from "pluralize";
import React, { type FC, useState } from "react";
import ApplicationDetailView from "@/components/FundingPlatform/ApplicationView/ApplicationDetailView";
import { ActionItems } from "@/components/Inbox/ActionItems";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { QueueSummary } from "@/components/Inbox/QueueSummary";
import { describeFollowUp } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utilities/formatDate";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { cn } from "@/utilities/tailwind";

interface InboxApplicationDetailProps {
  item: InboxItem;
  communityId: string;
  /** Community admins get the stage header and the follow-up log. */
  showAdminTools: boolean;
}

/**
 * The facts an admin checks before acting, in one strip: when it came in, the
 * stage and how long it has sat there, which paperwork is still open after
 * approval, and the next scheduled chase.
 */
const FactsStrip: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const meta = ATTENTION_META[item.attentionReason];
  const days = item.stageAgeDays;
  const followUp = describeFollowUp(item.nextFollowUpAt, (iso) => formatDate(iso, "UTC"));
  const gates = item.pendingGates ?? [];
  const cells: { label: string; value: string; note?: string; noteClass?: string }[] = [
    {
      label: "Submitted",
      value: item.submittedAt ? formatDate(item.submittedAt, "UTC") : "Unknown",
    },
    {
      label: "Stage",
      value: meta.label,
      note:
        typeof days === "number"
          ? `${days} ${pluralize("day", days)} ${meta.ageSuffix}`
          : undefined,
    },
    {
      label: "Paperwork",
      value: gates.length
        ? gates.map((gate) => ATTENTION_META[gate].label).join(" and ")
        : "Complete",
    },
    {
      label: "Next follow-up",
      value: followUp.scheduled ? followUp.shortLabel : "None scheduled",
      note:
        followUp.scheduled && item.nextFollowUpAt
          ? formatDate(item.nextFollowUpAt, "UTC")
          : undefined,
      noteClass: followUp.overdue ? "text-red-600 dark:text-red-400" : undefined,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-4 dark:border-zinc-700 dark:bg-zinc-700">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-white px-3 py-2 dark:bg-zinc-900">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{cell.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
            {cell.value}
          </dd>
          {cell.note && (
            <dd className={cn("text-xs text-gray-500 dark:text-gray-400", cell.noteClass)}>
              {cell.note}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
};

type PanelTabKey = "followup" | "application";
const PANEL_TABS: { key: PanelTabKey; label: string }[] = [
  { key: "followup", label: "Follow-up" },
  { key: "application", label: "Application" },
];

/**
 * The application pane of the Reviewer Inbox: the same detail the program's
 * applications page shows, with the admin's stage header and follow-up log
 * above it so the queue is a place to work from, not just to read.
 */
const InboxApplicationDetailComponent: FC<InboxApplicationDetailProps> = ({
  item,
  communityId,
  showAdminTools,
}) => {
  const rawProgramId = item.programId;
  const programId = normalizeProgramId(rawProgramId);
  const combinedProgramId = rawProgramId.includes("_")
    ? rawProgramId
    : item.chainID
      ? `${rawProgramId}_${item.chainID}`
      : rawProgramId;
  const referenceNumber = item.referenceNumber || item.id;
  const [activeTab, setActiveTab] = useState<PanelTabKey>("followup");

  const detail = (
    <ApplicationDetailView
      applicationId={referenceNumber}
      programId={programId}
      combinedProgramId={combinedProgramId}
      communityId={communityId}
      variant="panel"
    />
  );

  if (!showAdminTools) return detail;

  return (
    <div className="space-y-4">
      <FactsStrip item={item} />
      <div
        role="tablist"
        aria-label="Application detail sections"
        className="flex gap-1 border-b border-gray-200 dark:border-zinc-700"
      >
        {PANEL_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              id={`inbox-app-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`inbox-app-panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px rounded-none border-b-2 px-3",
                isActive
                  ? "border-primary-500 text-gray-950 dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`inbox-app-panel-${activeTab}`}
        aria-labelledby={`inbox-app-tab-${activeTab}`}
      >
        {activeTab === "followup" ? (
          <div className="space-y-4">
            <QueueSummary
              communityId={communityId}
              target={{ kind: "application", id: referenceNumber }}
            />
            <ActionItems
              communityId={communityId}
              target={{ kind: "application", id: referenceNumber }}
              events={[]}
            />
          </div>
        ) : (
          detail
        )}
      </div>
    </div>
  );
};

export const InboxApplicationDetail = React.memo(InboxApplicationDetailComponent);
InboxApplicationDetail.displayName = "InboxApplicationDetail";
