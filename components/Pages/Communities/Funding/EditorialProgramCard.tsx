"use client";

import { ArrowRight, CalendarClock, Users } from "lucide-react";
import Link from "next/link";
import type { FundingProgram } from "@/types/whitelabel-entities";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

type Urgency = "open" | "closing" | "urgent" | "closed" | "upcoming";

interface ProgramComputed {
  status: "open" | "closed" | "coming-soon" | "deadline-passed";
  urgency: Urgency;
  daysLeft: number | null;
  pool: number;
  maxGrant: number;
  applicants: number;
  category: string | null;
  accentClass: string;
}

const ACCENT_CLASS = "bg-brand-500";

function parseAmount(raw?: string | number): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function computeProgramView(program: FundingProgram): ProgramComputed {
  const now = new Date();
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;

  let status: ProgramComputed["status"] = "open";
  if (endsAt && now > endsAt) status = "deadline-passed";
  else if (startsAt && now < startsAt) status = "coming-soon";
  else if (program.metadata?.status === "inactive") status = "closed";

  const daysLeft = endsAt
    ? Math.max(0, Math.round((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  let urgency: Urgency = "open";
  if (status === "deadline-passed" || status === "closed") urgency = "closed";
  else if (status === "coming-soon") urgency = "upcoming";
  else if (daysLeft !== null && daysLeft <= 3) urgency = "urgent";
  else if (daysLeft !== null && daysLeft <= 7) urgency = "closing";

  const pool = parseAmount(program.metadata?.programBudget);
  const maxGrant = parseAmount(program.metadata?.maxGrantSize);
  const applicants = program.metrics?.totalApplications ?? program.metadata?.applicantsNumber ?? 0;
  const category = program.metadata?.categories?.[0] ?? program.metadata?.type ?? null;

  return {
    status,
    urgency,
    daysLeft,
    pool,
    maxGrant,
    applicants,
    category,
    accentClass: ACCENT_CLASS,
  };
}

const URGENCY_BADGE: Record<Urgency, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  closing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  upcoming: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const DOT_COLOR: Record<Urgency, string> = {
  urgent: "bg-red-500",
  closing: "bg-amber-500",
  open: "bg-green-500",
  closed: "bg-zinc-400 dark:bg-zinc-500",
  upcoming: "bg-sky-500",
};

function urgencyLabel(u: Urgency, daysLeft: number | null): string {
  if (u === "closed") return "Closed";
  if (u === "upcoming") return "Coming soon";
  if (daysLeft === null) return "Open";
  return `${daysLeft}d left`;
}

interface EditorialProgramCardProps {
  program: FundingProgram;
  communityId: string;
}

export function EditorialProgramCard({ program, communityId }: EditorialProgramCardProps) {
  const view = computeProgramView(program);
  const title = program.metadata?.title ?? program.name ?? "Untitled program";
  const description = program.metadata?.shortDescription ?? program.metadata?.description ?? "";
  const href = PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId);
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const dateLabel = (() => {
    if (view.urgency === "upcoming" && startsAt) {
      return `Opens ${startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (endsAt) {
      const formatted = endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return view.urgency === "closed" ? `Closed ${formatted}` : `Closes ${formatted}`;
    }
    return null;
  })();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.18)]">
      {/* Top color stripe */}
      <div className={cn("h-1.5 w-full", view.accentClass)} aria-hidden />

      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <header className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              URGENCY_BADGE[view.urgency]
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLOR[view.urgency])} aria-hidden />
            {urgencyLabel(view.urgency, view.daysLeft)}
          </span>
        </header>

        <div>
          <h3 className="text-lg md:text-xl font-semibold tracking-[-0.015em] leading-snug text-foreground">
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
            >
              {title}
            </Link>
          </h3>
          {description ? (
            <p className="mt-2 line-clamp-3 min-h-[3rem] text-[13.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {view.pool > 0 || view.maxGrant > 0 ? (
          <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            {view.pool > 0 ? (
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Pool
                </dt>
                <dd className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-foreground">
                  {`$${formatCurrency(view.pool)}`}
                </dd>
              </div>
            ) : null}
            {view.maxGrant > 0 ? (
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Max grant
                </dt>
                <dd className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-foreground">
                  {`$${formatCurrency(view.maxGrant)}`}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <footer className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          {view.applicants > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {view.applicants} {view.applicants === 1 ? "applicant" : "applicants"}
            </span>
          ) : (
            <span />
          )}
          {dateLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {dateLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Details
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </footer>
      </div>
    </article>
  );
}
