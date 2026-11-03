"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import pluralize from "pluralize";
import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import type { MilestonePaymentStatus } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type {
  IMilestoneTimeline,
  MilestoneAttentionReason,
  MilestoneTimelineEventType,
} from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

type StepState = "done" | "current" | "pending";

interface Step {
  label: string;
  state: StepState;
  detail: string;
  /** The current step carries the stage age; red when the delivery itself is late. */
  tone?: "late" | "waiting";
}

const STEP_LABELS = ["Milestone due", "Review", "Invoice due", "Payment due"] as const;

/** Which step the queue stage points at; the indexer's call wins over the events. */
const STEP_BY_REASON: Record<MilestoneAttentionReason, number> = {
  past_due: 0,
  awaiting_review: 1,
  awaiting_invoice: 2,
  invoice_unpaid: 3,
};

/** The Control Center's names for a manual payment status. */
const PAYMENT_STATUS_LABEL: Record<MilestonePaymentStatus, string> = {
  unpaid: "unpaid",
  pending: "pending",
  awaiting_signatures: "awaiting sigs",
  disbursed: "disbursed",
};

interface Facts {
  completedAt?: string;
  rejectedAt?: string;
  verifiedAt?: string;
  invoiceSentAt?: string;
  invoiceReceivedAt?: string;
  paidAt?: string;
}

/** The latest event of a type, optionally only after a given moment. */
function latestAt(
  events: IMilestoneTimeline["events"],
  type: MilestoneTimelineEventType,
  after?: string
): string | undefined {
  let found: string | undefined;
  for (const event of events) {
    if (event.type !== type) continue;
    if (after && event.at <= after) continue;
    if (!found || event.at > found) found = event.at;
  }
  return found;
}

function readFacts(timeline: IMilestoneTimeline): Facts {
  const completedAt = latestAt(timeline.events, "completed");
  return {
    completedAt,
    rejectedAt: latestAt(timeline.events, "rejected", completedAt),
    verifiedAt: latestAt(timeline.events, "verified", completedAt),
    invoiceSentAt: latestAt(timeline.events, "invoice_sent"),
    invoiceReceivedAt: latestAt(timeline.events, "invoice_received"),
    paidAt: latestAt(timeline.events, "payment_disbursed"),
  };
}

const day = (iso: string) => formatDate(iso, "UTC");
const dated = (verb: string, iso?: string) => (iso ? `${verb} ${day(iso)}` : verb);

function deliveryDetail(timeline: IMilestoneTimeline, facts: Facts, done: boolean): string {
  if (facts.rejectedAt) return dated("Rejected", facts.rejectedAt);
  if (facts.completedAt || done) return dated("Submitted", facts.completedAt);
  return timeline.dueDate ? `Due ${day(timeline.dueDate)}` : "No due date";
}

function invoiceDetail(facts: Facts, done: boolean): string {
  if (facts.invoiceReceivedAt) return dated("Received", facts.invoiceReceivedAt);
  if (facts.invoiceSentAt) return dated("Requested", facts.invoiceSentAt);
  if (facts.paidAt) return "No invoice";
  return done ? "Received" : "Not received";
}

function paymentDetail(timeline: IMilestoneTimeline, facts: Facts, done: boolean): string {
  if (facts.paidAt || done) return dated("Paid", facts.paidAt);
  const override = timeline.invoice?.paymentStatusOverride as MilestonePaymentStatus | null;
  if (override) {
    const label = PAYMENT_STATUS_LABEL[override] ?? override;
    return dated(`Marked ${label}`, timeline.invoice?.paymentStatusOverrideDate ?? undefined);
  }
  return "Not paid";
}

function stageAge(timeline: IMilestoneTimeline): string | null {
  const reason = timeline.attentionReason;
  if (!reason || typeof timeline.stageAgeDays !== "number") return null;
  const days = timeline.stageAgeDays;
  return `${days} ${pluralize("day", days)} ${ATTENTION_META[reason].ageSuffix}`;
}

/**
 * The four payment steps of a milestone as one row, from the same timeline
 * the activity log reads. The queue stage decides where the item stands:
 * every step before it is passed, the step itself is current. Without a
 * stage, a step is passed by its own event and the first open one is
 * current. A rejection after the latest delivery reopens the first step.
 */
function buildSteps(timeline: IMilestoneTimeline): Step[] {
  const facts = readFacts(timeline);
  const stageStep = timeline.attentionReason ? STEP_BY_REASON[timeline.attentionReason] : null;
  const happened = [
    Boolean(facts.completedAt) && !facts.rejectedAt,
    Boolean(facts.verifiedAt),
    Boolean(facts.invoiceReceivedAt) || (Boolean(facts.paidAt) && !facts.invoiceSentAt),
    Boolean(facts.paidAt) || timeline.invoice?.status === "paid",
  ];
  const done = happened.map((own, index) => own || (stageStep !== null && index < stageStep));
  const current = stageStep ?? done.indexOf(false);
  const age = stageAge(timeline);

  const details = [
    deliveryDetail(timeline, facts, done[0]),
    facts.verifiedAt || done[1] ? dated("Verified", facts.verifiedAt) : "Not verified",
    invoiceDetail(facts, done[2]),
    paymentDetail(timeline, facts, done[3]),
  ];

  return STEP_LABELS.map((label, index) => {
    const isCurrent = index === current && !done[index];
    const withAge = isCurrent && age;
    return {
      label,
      detail: withAge ? `${details[index]} · ${age}` : details[index],
      state: done[index] ? "done" : isCurrent ? "current" : "pending",
      ...(withAge && { tone: timeline.attentionReason === "past_due" ? "late" : "waiting" }),
    };
  });
}

const DETAIL_TONE: Record<NonNullable<Step["tone"]>, string> = {
  late: "text-red-600 dark:text-red-400",
  waiting: "text-amber-600 dark:text-amber-300",
};

const Connector: FC<{ passed: boolean; side: "left" | "right" }> = ({ passed, side }) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute top-3 hidden h-px sm:block",
      side === "left" ? "left-0 right-1/2" : "left-1/2 right-0",
      passed ? "bg-green-600" : "bg-gray-200 dark:bg-zinc-700"
    )}
  />
);

const FundingPipelineComponent: FC<{ timeline: IMilestoneTimeline }> = ({ timeline }) => {
  const steps = buildSteps(timeline);
  const currentDot = timeline.attentionReason
    ? ATTENTION_META[timeline.attentionReason].dotClass
    : "bg-gray-400";

  return (
    <ol
      aria-label="Funding pipeline"
      className="m-0 grid list-none grid-cols-2 gap-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex min-w-0 flex-col items-center px-1 text-center"
        >
          {index > 0 && <Connector side="left" passed={steps[index - 1].state === "done"} />}
          {index < steps.length - 1 && <Connector side="right" passed={step.state === "done"} />}
          <span
            className={cn(
              "relative z-10 flex h-6 w-6 items-center justify-center rounded-full",
              step.state === "done" && "bg-green-600 text-white",
              step.state === "current" && cn("text-white", currentDot),
              step.state === "pending" && "bg-gray-200 dark:bg-zinc-700"
            )}
          >
            {step.state === "done" && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
          <span className="mt-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">
            {step.label}
          </span>
          <span
            className={cn(
              "text-[11px]",
              step.tone
                ? DETAIL_TONE[step.tone]
                : step.state === "current"
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
            )}
          >
            {step.detail}
          </span>
        </li>
      ))}
    </ol>
  );
};

export const FundingPipeline = React.memo(FundingPipelineComponent);
FundingPipeline.displayName = "FundingPipeline";
