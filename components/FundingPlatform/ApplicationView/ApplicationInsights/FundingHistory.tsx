"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, memo, type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  TrackRecordGrant,
  TrackRecordMilestone,
} from "@/services/applicationInsights.service";
import { cn } from "@/utilities/tailwind";
import { InfoHint, InsightsEmpty, InsightsSection, StatusPill } from "./InsightsPrimitives";
import {
  type FundingByToken,
  formatDate,
  formatTokenAmount,
  getMilestoneState,
  grantLabel,
  grantToken,
  type MilestoneState,
  parseAmount,
  paymentDelayDays,
  type TrackRecordSummary,
  unallocatedAmount,
} from "./insightsModel";

const COLUMN_COUNT = 6;
/** At or below this many grants every grant opens; from COLLAPSE_ALL_FROM on, all start closed. */
const OPEN_ALL_UP_TO = 2;
const COLLAPSE_ALL_FROM = 5;

function stateLabel(milestone: TrackRecordMilestone, state: MilestoneState) {
  switch (state.kind) {
    case "delivered":
      return {
        tone: "green" as const,
        label: milestone.completedAt
          ? `${milestone.currentStatus === "verified" ? "Verified" : "Completed"} ${formatDate(milestone.completedAt, false)}`
          : "Completed",
      };
    case "past_due":
      return { tone: "red" as const, label: "Past due" };
    case "rejected":
      return { tone: "red" as const, label: "Rejected" };
    case "in_progress":
      return { tone: "blue" as const, label: "In progress" };
    default:
      return { tone: "gray" as const, label: "Upcoming" };
  }
}

function timingText(state: MilestoneState): string | null {
  if (state.dayOffset === null) return null;
  const days = Math.abs(state.dayOffset);
  if (state.kind === "delivered") {
    if (state.dayOffset === 0) return "On the due date";
    return `${pluralize("day", days, true)} ${state.dayOffset > 0 ? "after" : "before"} due date`;
  }
  if (state.kind === "past_due") return `${pluralize("day", days, true)} overdue`;
  return `Due in ${pluralize("day", days, true)}`;
}

function paymentNote(milestone: TrackRecordMilestone): string | null {
  if (!milestone.paidAt) return null;
  const delay = paymentDelayDays(milestone);
  const paidOn = formatDate(milestone.paidAt, false);
  if (delay === null || delay < 0) return paidOn;
  return `${paidOn} · ${pluralize("day", delay, true)} after verified`;
}

const PaidBar: FC<{ ratio: number }> = ({ ratio }) =>
  ratio > 0 ? (
    <span
      aria-hidden="true"
      className="block h-1 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
    >
      <span
        className="block h-full rounded-full bg-brand-emphasis dark:bg-brand-500"
        style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
      />
    </span>
  ) : null;

const MilestoneRow = memo(function MilestoneRow({
  milestone,
  token,
  now,
}: {
  milestone: TrackRecordMilestone;
  token: string;
  now: Date;
}) {
  const state = getMilestoneState(milestone, now);
  const { tone, label } = stateLabel(milestone, state);
  const timing = timingText(state);
  const lateDelivery = state.kind === "delivered" && (state.dayOffset ?? 0) > 0;
  const amount = parseAmount(milestone.allocatedAmount);
  const paid = parseAmount(milestone.paidAmount);
  const note = paymentNote(milestone);

  return (
    <tr className="border-t border-gray-100 dark:border-zinc-700">
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{milestone.title}</td>
      <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {amount !== null ? (
          formatTokenAmount(amount, token)
        ) : (
          <span className="text-gray-400 dark:text-gray-500">Not set</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm tabular-nums">
        {paid !== null ? (
          <div className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap text-gray-900 dark:text-gray-100">
              {formatTokenAmount(paid, token)}
            </span>
            {note ? <span className="text-xs text-gray-500 dark:text-gray-400">{note}</span> : null}
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {milestone.dueDate ? formatDate(milestone.dueDate) : "No due date"}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone={tone}>{label}</StatusPill>
          {timing || milestone.completionPercentage !== null ? (
            <span
              className={
                lateDelivery
                  ? "text-xs text-yellow-700 dark:text-yellow-300"
                  : "text-xs text-gray-500 dark:text-gray-400"
              }
            >
              {[
                timing,
                milestone.completionPercentage !== null
                  ? `${milestone.completionPercentage}% complete`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 pr-4 text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {milestone.evaluation ? (
          `${milestone.evaluation.rating} / 10`
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            {state.kind === "delivered" ? "Not evaluated" : "—"}
          </span>
        )}
      </td>
    </tr>
  );
});

function grantProgress(grant: TrackRecordGrant, now: Date): string {
  if (!grant.milestones.length) return "No milestones";
  const states = grant.milestones.map((milestone) => getMilestoneState(milestone, now));
  const delivered = states.filter((state) => state.kind === "delivered").length;
  const pastDue = states.filter((state) => state.kind === "past_due").length;
  return [
    `${delivered} of ${grant.milestones.length} delivered`,
    pastDue ? `${pastDue} past due` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function grantMilestoneRows(grant: TrackRecordGrant, token: string, now: Date): ReactNode {
  if (!grant.milestones.length) {
    return (
      <tr className="border-t border-gray-100 dark:border-zinc-700">
        <td colSpan={COLUMN_COUNT} className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          No milestones on this grant
        </td>
      </tr>
    );
  }
  const remainder = unallocatedAmount(grant);
  return (
    <>
      {grant.milestones.map((milestone) => (
        <MilestoneRow key={milestone.uid} milestone={milestone} token={token} now={now} />
      ))}
      {remainder !== null ? (
        <tr className="border-t border-gray-100 dark:border-zinc-700">
          <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
            Not allocated to a milestone
          </td>
          <td
            colSpan={COLUMN_COUNT - 1}
            className="px-3 py-2.5 text-xs tabular-nums text-gray-500 dark:text-gray-400"
          >
            {formatTokenAmount(remainder, token)}
          </td>
        </tr>
      ) : null}
    </>
  );
}

const GrantRows = memo(function GrantRows({
  grant,
  now,
  expanded,
  onToggle,
}: {
  grant: TrackRecordGrant;
  now: Date;
  expanded: boolean;
  onToggle: (uid: string) => void;
}) {
  const approved = parseAmount(grant.totalGrantAmount);
  const paid = parseAmount(grant.paidAmount);
  const token = grantToken(grant);
  const ratio = approved && paid ? paid / approved : 0;

  return (
    <>
      <tr className="border-t border-gray-100 bg-gray-50 first:border-t-0 dark:border-zinc-700 dark:bg-zinc-900/40">
        <td className="p-0">
          <Button
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => onToggle(grant.uid)}
            className="h-auto w-full justify-start gap-2 rounded-none px-4 py-3 text-left font-normal hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 motion-reduce:transition-none",
                expanded && "rotate-90"
              )}
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {grantLabel(grant)}
            </span>
            <StatusPill tone={grant.isCompleted ? "green" : "gray"}>
              {grant.isCompleted ? "Completed" : "Active"}
            </StatusPill>
          </Button>
        </td>
        <td className="px-3 py-3 align-middle">
          {approved !== null ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                {formatTokenAmount(approved)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{token}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">Not set</span>
          )}
        </td>
        <td className="px-3 py-3 align-middle">
          {approved === null && paid === null ? (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                {formatTokenAmount(paid ?? 0)}
                {approved ? (
                  <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                    {Math.round(ratio * 100)}%
                  </span>
                ) : null}
              </span>
              <PaidBar ratio={ratio} />
            </div>
          )}
        </td>
        <td
          colSpan={COLUMN_COUNT - 3}
          className="px-3 py-3 pr-4 text-right align-middle text-xs tabular-nums text-gray-500 dark:text-gray-400"
        >
          {grantProgress(grant, now)}
        </td>
      </tr>
      {expanded ? grantMilestoneRows(grant, token, now) : null}
    </>
  );
});

/** Small histories open fully; mid-size ones open the newest grant with milestones; long ones start closed. */
function initiallyExpanded(grants: TrackRecordGrant[]): Set<string> {
  if (grants.length <= OPEN_ALL_UP_TO) return new Set(grants.map((grant) => grant.uid));
  if (grants.length >= COLLAPSE_ALL_FROM) return new Set();
  const first = grants.find((grant) => grant.milestones.length > 0) ?? grants[0];
  return new Set(first ? [first.uid] : []);
}

export const FundingHistory: FC<{ grants: TrackRecordGrant[]; now: Date }> = ({ grants, now }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => initiallyExpanded(grants));
  const allExpanded = grants.length > 0 && grants.every((grant) => expanded.has(grant.uid));
  const toggle = useCallback((uid: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  return (
    <InsightsSection
      title="Funding history"
      meta={grants.length ? pluralize("grant", grants.length, true) : undefined}
      action={
        grants.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              setExpanded(allExpanded ? new Set() : new Set(grants.map((grant) => grant.uid)))
            }
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        ) : undefined
      }
    >
      {grants.length ? (
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-700">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Milestone</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">Amount</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Paid
                    <InfoHint label="Paid">
                      Payouts recorded as disbursed on Karma, with the date paid and how long after
                      the milestone was verified.
                    </InfoHint>
                  </span>
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">Due</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                <th className="whitespace-nowrap px-3 py-2.5 pr-4 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Milestone eval
                    <InfoHint label="Milestone eval">
                      Karma's AI review of the milestone completion and its proof, scored out of 10.
                      Shown only for delivered milestones.
                    </InfoHint>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => (
                <GrantRows
                  key={grant.uid}
                  grant={grant}
                  now={now}
                  expanded={expanded.has(grant.uid)}
                  onToggle={toggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <InsightsEmpty
          title="No previous grants on Karma"
          description="This project has no grants or milestones recorded on Karma, so there is no delivery history to show."
        />
      )}
    </InsightsSection>
  );
};

const SUMMARY_HINTS: Record<string, string> = {
  "Milestones delivered":
    "Milestones marked completed or verified across all of this project's grants on Karma, not just this program.",
  "Past due now":
    "Open milestones whose due date has passed. A milestone keeps counting until the grantee marks it completed on Karma.",
  Funding:
    "Approved amounts come from each grant's payout configuration; paid amounts are disbursed payouts. Grants without a token are counted as USDC, the default payout token. Different tokens are never added together.",
  "Commitments met":
    "Committed metrics whose latest value meets its target. Metrics without a target are not counted.",
};

function deliveredSub(hasHistory: boolean, summary: TrackRecordSummary): string {
  if (!hasHistory || summary.milestoneCount === 0) return "No milestones on Karma";
  if (summary.deliveredCount === 0) return "Nothing delivered yet";
  if (summary.deliveredLateCount) {
    return `${summary.deliveredLateCount} delivered after the due date`;
  }
  return "All on or before the due date";
}

type CommitmentCounts = { met: number; withTarget: number; withoutTarget: number };

interface SummaryFact {
  label: string;
  value: ReactNode;
  sub: string;
  alert: boolean;
  extra?: ReactNode;
  hint?: ReactNode;
}

function pastDueFact(hasHistory: boolean, summary: TrackRecordSummary): SummaryFact {
  let sub = "No milestones on Karma";
  if (hasHistory)
    sub = summary.pastDueCount ? "Open milestones past their due date" : "Nothing overdue";
  return {
    label: "Past due now",
    value: hasHistory ? String(summary.pastDueCount) : "None",
    sub,
    alert: summary.pastDueCount > 0,
  };
}

function percentOf(part: number, whole: number): number {
  return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
}

const SummaryPaidBar: FC<{ percent: number }> = ({ percent }) => (
  <span
    aria-hidden="true"
    className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
  >
    <span
      className="block h-full rounded-full bg-brand-emphasis dark:bg-brand-500"
      style={{ width: `${percent}%` }}
    />
  </span>
);

const FundingHintRow: FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong = false,
}) => (
  <span className={cn("flex items-baseline justify-between gap-4", strong && "font-semibold")}>
    <span className={strong ? undefined : "opacity-80"}>{label}</span>
    <span className="tabular-nums">{value}</span>
  </span>
);

const FundingHint: FC<{ group: FundingByToken; grants: TrackRecordGrant[] }> = ({
  group,
  grants,
}) => {
  const pending = Math.max(0, group.approved - group.paid);
  const groupGrants = grants.filter(
    (grant) => grantToken(grant) === group.token && parseAmount(grant.totalGrantAmount) !== null
  );
  return (
    <span className="flex min-w-56 flex-col gap-1.5">
      <FundingHintRow
        label="Approved"
        value={formatTokenAmount(group.approved, group.token)}
        strong
      />
      <FundingHintRow
        label="Paid"
        value={`${formatTokenAmount(group.paid, group.token)} (${percentOf(group.paid, group.approved)}%)`}
      />
      <FundingHintRow label="Pending" value={formatTokenAmount(pending, group.token)} />
      <span aria-hidden="true" className="my-0.5 block h-px bg-current opacity-20" />
      <span className="flex flex-col gap-1">
        {groupGrants.map((grant) => (
          <FundingHintRow
            key={grant.uid}
            label={grantLabel(grant)}
            value={`${formatTokenAmount(parseAmount(grant.paidAmount) ?? 0)} of ${formatTokenAmount(parseAmount(grant.totalGrantAmount) ?? 0)} paid`}
          />
        ))}
      </span>
      <span className="opacity-80">
        Approved amounts come from each grant's payout configuration and paid amounts from disbursed
        payouts. Grants without a token count as USDC.
      </span>
    </span>
  );
};

function fundingFact(grants: TrackRecordGrant[], summary: TrackRecordSummary): SummaryFact {
  const label = "Funding";
  if (!grants.length) return { label, value: "None", sub: "First grant on Karma", alert: false };
  const [primary, ...others] = summary.fundingByToken;
  if (!primary) {
    return {
      label,
      value: "Not set",
      sub: "No grant has a payout amount configured",
      alert: false,
    };
  }
  const paidPercent = percentOf(primary.paid, primary.approved);
  const source = [
    `${paidPercent}% paid`,
    `across ${pluralize("grant", primary.grantCount, true)}`,
    ...others.map(
      (group) =>
        `plus ${formatTokenAmount(group.approved, group.token)} (${formatTokenAmount(group.paid, group.token)} paid)`
    ),
    summary.grantsWithoutAmount.length
      ? `${pluralize("grant", summary.grantsWithoutAmount.length, true)} without an amount`
      : null,
  ].filter((line): line is string => Boolean(line));

  return {
    label,
    value: (
      <>
        {formatTokenAmount(primary.approved, primary.token)}
        <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">approved</span>
      </>
    ),
    sub: source.join(" · "),
    alert: false,
    extra: <SummaryPaidBar percent={paidPercent} />,
    hint: <FundingHint group={primary} grants={grants} />,
  };
}

function commitmentsFact(commitments: CommitmentCounts | null): SummaryFact {
  const label = "Commitments met";
  if (!commitments) return { label, value: "None", sub: "Loading indicators", alert: false };
  if (!commitments.withTarget) {
    return { label, value: "None", sub: "No committed targets", alert: false };
  }
  return {
    label,
    value: `${commitments.met} of ${commitments.withTarget}`,
    sub: commitments.withoutTarget
      ? `${commitments.withoutTarget} more without a target`
      : "Every commitment has a target",
    alert: false,
  };
}

export const SummaryStrip: FC<{
  grants: TrackRecordGrant[];
  summary: TrackRecordSummary;
  commitments: CommitmentCounts | null;
}> = ({ grants, summary, commitments }) => {
  const hasHistory = grants.length > 0;
  const facts: SummaryFact[] = [
    {
      label: "Milestones delivered",
      value: hasHistory ? `${summary.deliveredCount} of ${summary.milestoneCount}` : "None",
      sub: deliveredSub(hasHistory, summary),
      alert: false,
    },
    pastDueFact(hasHistory, summary),
    fundingFact(grants, summary),
    commitmentsFact(commitments),
  ];

  return (
    <dl className="grid grid-cols-2 rounded-lg border border-gray-200 dark:border-zinc-700 lg:grid-cols-4 lg:divide-x lg:divide-gray-200 dark:lg:divide-zinc-700">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1 p-4">
          <dt className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            {fact.label}
            <InfoHint label={fact.label}>{fact.hint ?? SUMMARY_HINTS[fact.label]}</InfoHint>
          </dt>
          <dd
            className={
              fact.alert
                ? "text-xl font-semibold tabular-nums text-red-600 dark:text-red-400"
                : "text-xl font-semibold tabular-nums text-gray-900 dark:text-white"
            }
          >
            {fact.value}
          </dd>
          {fact.extra ? <dd>{fact.extra}</dd> : null}
          {fact.sub ? (
            <dd className="text-xs text-gray-500 dark:text-gray-400">{fact.sub}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
};
