"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import pluralize from "pluralize";
import React, { type FC } from "react";
import { ATTENTION_META } from "@/components/Inbox/attentionMeta";
import type { IMilestoneTimeline, MilestoneTimelineEventType } from "@/types/funding-platform";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

type StepState = "done" | "current" | "pending";

interface Step {
  label: string;
  state: StepState;
  detail: string;
  late?: boolean;
}

const STEP_LABELS = ["Milestone due", "Review", "Invoice due", "Payment due"] as const;

/** The latest event of a type, or of a type after a given moment. */
function latestAt(
  timeline: IMilestoneTimeline,
  type: MilestoneTimelineEventType,
  after?: string
): string | undefined {
  let found: string | undefined;
  for (const event of timeline.events) {
    if (event.type !== type) continue;
    if (after && event.at <= after) continue;
    if (!found || event.at > found) found = event.at;
  }
  return found;
}

const day = (iso: string) => formatDate(iso, "UTC");

const CURRENT_STEP_BY_REASON: Partial<
  Record<NonNullable<IMilestoneTimeline["attentionReason"]>, number>
> = {
  past_due: 0,
  awaiting_review: 1,
  awaiting_invoice: 2,
  invoice_unpaid: 3,
};

/**
 * The four payment steps of a milestone as one row, from the same timeline
 * the activity log reads. A step is passed only by its own event; the one
 * exception is a payment recorded with no invoice on file, which closes the
 * invoice step. The current step is the queue stage when the item has one,
 * otherwise the first step not yet passed. A rejection after the latest
 * delivery sends the milestone back to the first step.
 */
function buildSteps(timeline: IMilestoneTimeline): Step[] {
  const completedAt = latestAt(timeline, "completed");
  const rejectedAt = latestAt(timeline, "rejected", completedAt);
  const verifiedAt = latestAt(timeline, "verified", completedAt);
  const invoiceSentAt = latestAt(timeline, "invoice_sent");
  const invoiceReceivedAt = latestAt(timeline, "invoice_received");
  const paidAt = latestAt(timeline, "payment_disbursed");
  const override = timeline.invoice?.paymentStatusOverride;
  const paidWithoutInvoice = Boolean(paidAt) && !invoiceReceivedAt && !invoiceSentAt;

  const done = [
    Boolean(completedAt) && !rejectedAt,
    Boolean(verifiedAt),
    Boolean(invoiceReceivedAt) || paidWithoutInvoice,
    Boolean(paidAt),
  ];
  const current =
    (timeline.attentionReason && CURRENT_STEP_BY_REASON[timeline.attentionReason]) ??
    done.indexOf(false);

  const details = [
    rejectedAt
      ? `Rejected ${day(rejectedAt)}`
      : completedAt
        ? `Submitted ${day(completedAt)}`
        : timeline.dueDate
          ? `Due ${day(timeline.dueDate)}`
          : "No due date",
    verifiedAt ? `Verified ${day(verifiedAt)}` : "Not verified",
    invoiceReceivedAt
      ? `Received ${day(invoiceReceivedAt)}`
      : invoiceSentAt
        ? `Requested ${day(invoiceSentAt)}`
        : paidWithoutInvoice
          ? "No invoice"
          : "Not received",
    paidAt
      ? `Paid ${day(paidAt)}`
      : override
        ? `Marked ${override.replace(/_/g, " ")}${
            timeline.invoice?.paymentStatusOverrideDate
              ? ` ${day(timeline.invoice.paymentStatusOverrideDate)}`
              : ""
          }`
        : "Not paid",
  ];

  const reason = timeline.attentionReason;
  const age =
    reason && typeof timeline.stageAgeDays === "number"
      ? `${timeline.stageAgeDays} ${pluralize("day", timeline.stageAgeDays)} ${ATTENTION_META[reason].ageSuffix}`
      : null;
  if (age && current >= 0 && !done[current]) details[current] = `${details[current]} · ${age}`;

  return STEP_LABELS.map((label, index) => ({
    label,
    detail: details[index],
    state: done[index] ? "done" : index === current ? "current" : "pending",
    late: index === current && Boolean(age) && !done[index],
  }));
}

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
          {index > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 right-1/2 top-3 hidden h-px sm:block",
                steps[index - 1].state === "done" ? "bg-green-600" : "bg-gray-200 dark:bg-zinc-700"
              )}
            />
          )}
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1/2 right-0 top-3 hidden h-px sm:block",
                step.state === "done" ? "bg-green-600" : "bg-gray-200 dark:bg-zinc-700"
              )}
            />
          )}
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
              step.late && timeline.attentionReason === "past_due"
                ? "text-red-600 dark:text-red-400"
                : step.late
                  ? "text-amber-600 dark:text-amber-300"
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
