"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { FundingProgram } from "@/types/whitelabel-entities";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { computeProgramView } from "./EditorialProgramCard";

const URGENCY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  closing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  upcoming: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const DOT_COLOR: Record<string, string> = {
  urgent: "bg-red-500",
  closing: "bg-amber-500",
  open: "bg-green-500",
  closed: "bg-zinc-400 dark:bg-zinc-500",
  upcoming: "bg-sky-500",
};

export function FeaturedProgram({
  program,
  communityId,
}: {
  program: FundingProgram;
  communityId: string;
}) {
  const view = computeProgramView(program);
  const title = program.metadata?.title ?? program.name ?? "Featured program";
  const summary = program.metadata?.shortDescription ?? program.metadata?.description ?? "";
  const href = PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId);
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const deadlineLabel = endsAt
    ? endsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const startLabel = startsAt
    ? startsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const dateRowLabel =
    view.urgency === "upcoming" ? "Opens" : view.urgency === "closed" ? "Closed" : "Deadline";
  const dateRowValue = view.urgency === "upcoming" ? startLabel : deadlineLabel;

  return (
    <section
      aria-label="Featured program"
      className="relative overflow-hidden rounded-3xl border border-border bg-background"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-background to-background dark:from-brand-900/20"
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-[380px] w-[380px] rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-500/10"
      />

      <div className="relative grid gap-8 p-8 md:grid-cols-[1.4fr_1fr] md:gap-12 md:p-11">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                URGENCY_BADGE[view.urgency] ?? URGENCY_BADGE.open
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  DOT_COLOR[view.urgency] ?? DOT_COLOR.open
                )}
                aria-hidden
              />
              {view.daysLeft !== null && view.urgency !== "closed"
                ? `${view.daysLeft} days left`
                : view.urgency === "closed"
                  ? "Closed"
                  : "Open"}
            </span>
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Featured
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
            {title}
          </h2>

          {summary ? (
            <p className="mt-4 max-w-prose text-[15px] md:text-[17px] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={href}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/90"
            >
              {view.urgency === "closed" ? "View details" : "Apply before deadline"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={href}
              className="inline-flex h-11 items-center rounded-lg border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              View details
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3.5">
          {view.pool > 0 ? (
            <KpiRow label="Total pool" value={`$${formatCurrency(view.pool)}`} big />
          ) : null}
          {view.maxGrant > 0 ? (
            <KpiRow label="Max grant" value={`$${formatCurrency(view.maxGrant)}`} />
          ) : null}
          {dateRowValue ? <KpiRow label={dateRowLabel} value={dateRowValue} /> : null}
          {view.applicants > 0 ? (
            <KpiRow label="Applicants" value={`${view.applicants} teams`} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function KpiRow({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-3 last:border-b-0">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tracking-[-0.015em] text-foreground",
          big ? "text-[24px]" : "text-base"
        )}
      >
        {value}
      </span>
    </div>
  );
}
