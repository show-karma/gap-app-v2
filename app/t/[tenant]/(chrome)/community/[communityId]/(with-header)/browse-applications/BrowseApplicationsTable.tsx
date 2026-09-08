"use client";

import { memo } from "react";
import { getProjectTitle } from "@/components/FundingPlatform/helper/getProjectTitle";
import { Link } from "@/src/components/navigation/Link";
import type { Application, ApplicationStatus } from "@/types/whitelabel-entities";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { cn } from "@/utilities/tailwind";

interface StatusStyle {
  pill: string;
  dot: string;
  label: string;
}

const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  under_review: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Under review",
  },
  pending: {
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Pending",
  },
  resubmitted: {
    pill: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "Resubmitted",
  },
  revision_requested: {
    pill: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-600",
    label: "Needs info",
  },
  approved: {
    pill: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    pill: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    dot: "bg-red-600",
    label: "Declined",
  },
  draft: {
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-500",
    label: "Draft",
  },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        style.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}

export const ApplicationRowMemo = memo(function ApplicationRowInner({
  application,
  communityId,
}: {
  application: Application;
  communityId: string;
}) {
  const projectName = getProjectTitle(application);
  const submitted = application.createdAt;
  const href = `/community/${communityId}/browse-applications/${application.referenceNumber}`;

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/40 last:border-b-0">
      <td className="px-4 py-3.5 align-middle">
        <Link
          href={href}
          className="block font-semibold tracking-[-0.01em] text-foreground hover:underline"
        >
          {projectName}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">{application.referenceNumber}</span>
          {submitted ? (
            <>
              <span aria-hidden>·</span>
              <span>submitted {renderRelativeTime(submitted, "")}</span>
            </>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3.5 align-middle">
        <StatusPill status={application.status} />
      </td>
      <td className="px-4 py-3.5 align-middle text-right">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
        >
          View
          <span aria-hidden>→</span>
        </Link>
      </td>
    </tr>
  );
});

export function LoadingSkeleton() {
  const skeletonKeys = ["bsk-1", "bsk-2", "bsk-3", "bsk-4", "bsk-5", "bsk-6"];
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Project
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground" />
          </tr>
        </thead>
        <tbody>
          {skeletonKeys.map((key) => (
            <tr key={key} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3.5">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-muted/60" />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface StatCardItem {
  label: string;
  value: number;
  accentClass: string;
}

export function StatStrip({ items }: { items: StatCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {item.label}
          </div>
          <div
            className={cn(
              "mt-0.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums",
              item.accentClass
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
