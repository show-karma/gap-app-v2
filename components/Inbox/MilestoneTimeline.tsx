"use client";

import {
  BanknotesIcon,
  CalendarIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  NoSymbolIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useMilestoneAdminTimeline } from "@/hooks/useMilestoneAdminTimeline";
import type {
  IMilestoneStageDurations,
  IMilestoneTimelineEvent,
  MilestoneTimelineEventType,
} from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

/**
 * Presentation metadata per event type. Module-level so it is built once.
 * The indexer decides which events exist; this table only decides how they look.
 */
const EVENT_META: Record<
  MilestoneTimelineEventType,
  { label: string; icon: typeof CalendarIcon; toneClass: string }
> = {
  created: {
    label: "Milestone created",
    icon: SparklesIcon,
    toneClass: "text-gray-500 dark:text-gray-400",
  },
  due: {
    label: "Due date",
    icon: CalendarIcon,
    toneClass: "text-gray-500 dark:text-gray-400",
  },
  completed: {
    label: "Update submitted",
    icon: CheckCircleIcon,
    toneClass: "text-teal-600 dark:text-teal-300",
  },
  verified: {
    label: "Verified",
    icon: CheckBadgeIcon,
    toneClass: "text-green-600 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    icon: XCircleIcon,
    toneClass: "text-red-600 dark:text-red-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: NoSymbolIcon,
    toneClass: "text-gray-500 dark:text-gray-400",
  },
  invoice_sent: {
    label: "Invoice requested",
    icon: DocumentArrowUpIcon,
    toneClass: "text-amber-600 dark:text-amber-300",
  },
  invoice_received: {
    label: "Invoice received",
    icon: DocumentCheckIcon,
    toneClass: "text-amber-600 dark:text-amber-300",
  },
  payment_disbursed: {
    label: "Payment disbursed",
    icon: BanknotesIcon,
    toneClass: "text-purple-600 dark:text-purple-300",
  },
};

const DURATION_LABELS: {
  key: keyof IMilestoneStageDurations;
  label: string;
}[] = [
  { key: "toDeliveryDays", label: "To delivery" },
  { key: "inReviewDays", label: "In review" },
  { key: "toInvoiceDays", label: "To invoice" },
  { key: "toPaymentDays", label: "To payment" },
];

/** Shortens a wallet address for display next to an event. */
function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const TimelineEventRow: FC<{ event: IMilestoneTimelineEvent; isLast: boolean }> = ({
  event,
  isLast,
}) => {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-[11px] top-6 h-full w-px bg-gray-200 dark:bg-zinc-700"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-900",
          meta.toneClass
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</span>
          {/*
            UTC, not local. The server computes every stage duration in UTC, so
            rendering these instants in the viewer's zone makes the timeline
            disagree with its own durations — and a date-only label west of UTC
            lands on the previous day.
          */}
          <time className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(event.at, "UTC")}
          </time>
        </div>
        {event.actor && (
          <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-zinc-500">
            by {shortenAddress(event.actor)}
          </p>
        )}
        {event.reason && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">
            {event.reason}
          </p>
        )}
      </div>
    </li>
  );
};

const StageDurations: FC<{ durations: IMilestoneStageDurations }> = ({ durations }) => {
  const present = DURATION_LABELS.filter((entry) => durations[entry.key] !== null);

  // Every stage is unreached — a brand new milestone. Showing four "—" tiles
  // would be noise, so render nothing.
  if (present.length === 0) return null;

  return (
    <dl className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {present.map((entry) => (
        <div key={entry.key} className="rounded-lg bg-gray-50 p-2.5 dark:bg-zinc-800/60">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{entry.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
            {durations[entry.key]}d
          </dd>
        </div>
      ))}
    </dl>
  );
};

interface MilestoneTimelineProps {
  communityId: string;
  milestoneUid: string;
  /** Gate the fetch — the endpoint is community-admin only. */
  enabled?: boolean;
}

/**
 * Lifecycle timeline for a queued milestone: when the update was submitted,
 * when it was verified, when the invoice arrived, when it was paid.
 *
 * The indexer assembles and orders the events; this renders them. Loading,
 * empty and error states are all handled explicitly.
 */
const MilestoneTimelineComponent: FC<MilestoneTimelineProps> = ({
  communityId,
  milestoneUid,
  enabled = true,
}) => {
  const { timeline, isLoading, error, refetch } = useMilestoneAdminTimeline(
    communityId,
    milestoneUid,
    { enabled }
  );

  if (isLoading) {
    return (
      <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Couldn&apos;t load this milestone&apos;s timeline.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (!timeline || timeline.events.length === 0) {
    return (
      <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
        <h3 className="mb-2 text-sm font-semibold text-gray-950 dark:text-white">Timeline</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No lifecycle events recorded for this milestone yet.
        </p>
      </section>
    );
  }

  const reasonMeta = timeline.attentionReason ? ATTENTION_META[timeline.attentionReason] : null;

  return (
    <section className="rounded-lg bg-gray-50 p-4 dark:bg-zinc-800/60">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">Timeline</h3>
        {reasonMeta && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              reasonMeta.badgeClass
            )}
          >
            {reasonMeta.label}
          </span>
        )}
      </div>

      <StageDurations durations={timeline.stageDurations} />

      <ol className="m-0 list-none p-0">
        {timeline.events.map((event, index) => (
          <TimelineEventRow
            key={`${event.type}-${event.at}`}
            event={event}
            isLast={index === timeline.events.length - 1}
          />
        ))}
      </ol>
    </section>
  );
};

export const MilestoneTimeline = React.memo(MilestoneTimelineComponent);
MilestoneTimeline.displayName = "MilestoneTimeline";
