"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
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
}

const STEP_LABELS = ["Milestone due", "Review", "Invoice due", "Payment due"] as const;

function lastEventAt(
  timeline: IMilestoneTimeline,
  type: MilestoneTimelineEventType
): string | undefined {
  for (let i = timeline.events.length - 1; i >= 0; i -= 1) {
    if (timeline.events[i].type === type) return timeline.events[i].at;
  }
  return undefined;
}

const day = (iso: string) => formatDate(iso, "UTC", "MMM D");

/**
 * The four payment steps of a milestone as one row, from the same timeline
 * the activity log reads. Each step shows the date it happened or what it is
 * waiting on; the first step not yet passed is marked current.
 */
function buildSteps(timeline: IMilestoneTimeline): Step[] {
  const completedAt = lastEventAt(timeline, "completed");
  const verifiedAt = lastEventAt(timeline, "verified");
  const rejectedAt = lastEventAt(timeline, "rejected");
  const invoiceSentAt = lastEventAt(timeline, "invoice_sent");
  const invoiceReceivedAt = lastEventAt(timeline, "invoice_received");
  const paidAt = lastEventAt(timeline, "payment_disbursed");

  const details: string[] = [
    completedAt
      ? `Submitted ${day(completedAt)}`
      : timeline.dueDate
        ? `Due ${day(timeline.dueDate)}`
        : "No due date",
    verifiedAt
      ? `Verified ${day(verifiedAt)}`
      : rejectedAt
        ? `Rejected ${day(rejectedAt)}`
        : "Not verified",
    invoiceReceivedAt
      ? `Received ${day(invoiceReceivedAt)}`
      : invoiceSentAt
        ? `Requested ${day(invoiceSentAt)}`
        : "Not received",
    paidAt
      ? `Paid ${day(paidAt)}`
      : timeline.invoice?.paymentStatusOverride
        ? `Marked ${timeline.invoice.paymentStatusOverride}`
        : "Not paid",
  ];
  const done = [
    Boolean(completedAt),
    Boolean(verifiedAt),
    Boolean(invoiceReceivedAt),
    Boolean(paidAt),
  ];
  const current = done.indexOf(false);

  return STEP_LABELS.map((label, index) => ({
    label,
    detail: details[index],
    state: done[index] ? "done" : index === current ? "current" : "pending",
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
              step.state === "current"
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
