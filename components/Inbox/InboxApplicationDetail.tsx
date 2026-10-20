"use client";

import pluralize from "pluralize";
import React, { type FC } from "react";
import ApplicationDetailView from "@/components/FundingPlatform/ApplicationView/ApplicationDetailView";
import { ActionItems } from "@/components/Inbox/ActionItems";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { describeFollowUp, stageAgeTone } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";
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
 * Where the application stands, stated once above the detail: the stage, how
 * long it has been there, and the next scheduled chase.
 */
const StageHeader: FC<{ item: InboxItem }> = ({ item }) => {
  if (!item.attentionReason) return null;
  const meta = ATTENTION_META[item.attentionReason];
  const days = item.stageAgeDays;
  const tone = stageAgeTone(days);
  const followUp = item.nextFollowUpAt
    ? describeFollowUp(item.nextFollowUpAt, (iso) => formatDate(iso, "UTC"))
    : null;
  const stages = item.pendingGates?.length ? item.pendingGates : [item.attentionReason];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      {stages.map((stage) => (
        <span
          key={stage}
          className={cn(
            "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
            ATTENTION_META[stage].badgeClass
          )}
        >
          {ATTENTION_META[stage].label}
        </span>
      ))}
      {typeof days === "number" && (
        <span className={cn("text-sm font-medium tabular-nums", tone.text)}>
          {days} {pluralize("day", days)} {meta.ageSuffix}
        </span>
      )}
      {followUp && (
        <span className={cn("text-sm", followUp.className)}>
          {followUp.overdue ? "Follow-up overdue" : "Next follow-up"} · {followUp.label}
        </span>
      )}
    </div>
  );
};

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

  return (
    <div className="space-y-4">
      {showAdminTools && <StageHeader item={item} />}
      <ApplicationDetailView
        applicationId={referenceNumber}
        programId={programId}
        combinedProgramId={combinedProgramId}
        communityId={communityId}
        variant="panel"
      />
      {showAdminTools && (
        <ActionItems
          communityId={communityId}
          target={{ kind: "application", id: referenceNumber }}
        />
      )}
    </div>
  );
};

export const InboxApplicationDetail = React.memo(InboxApplicationDetailComponent);
InboxApplicationDetail.displayName = "InboxApplicationDetail";
