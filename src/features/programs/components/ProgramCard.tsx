"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { FundingProgram } from "@/types/whitelabel-entities";

interface ProgramCardProps {
  program: FundingProgram;
  communityId: string;
}

type ProgramStatusType = "open" | "closed" | "coming-soon" | "deadline-passed" | "not-configured";

interface ProgramStatusInfo {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<ProgramStatusType, ProgramStatusInfo> = {
  open: { label: "Open for Applications", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Applications Closed", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  "coming-soon": { label: "Coming Soon", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "deadline-passed": { label: "Deadline Passed", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  "not-configured": { label: "Not Yet Available", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

function getProgramStatus(program: FundingProgram): ProgramStatusType {
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;

  const now = new Date();
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;
  const isOpen = startsAt && endsAt ? now >= startsAt && now <= endsAt : true;

  if (!hasFormConfig) return "not-configured";
  if (!isEnabled) return "closed";
  if (isDeadlinePassed) return "deadline-passed";
  if (!isOpen) {
    if (startsAt && startsAt > now) return "coming-soon";
    return "closed";
  }
  return "open";
}

function isProgramEnabled(program: FundingProgram): boolean {
  return getProgramStatus(program) === "open";
}

function getProgramDisabledReason(program: FundingProgram): string {
  const status = getProgramStatus(program);
  switch (status) {
    case "not-configured":
      return "Applications not yet available";
    case "deadline-passed":
      return "Application deadline has passed";
    case "coming-soon":
      return `Applications open ${program.metadata?.startsAt ? new Date(program.metadata.startsAt).toLocaleDateString() : "soon"}`;
    case "closed":
      return "Applications are currently closed";
    default:
      return "";
  }
}

function formatCurrency(amount?: string | number): string {
  if (amount === undefined || amount === null || amount === "") return "TBD";
  if (typeof amount === "number") {
    if (amount === 0) return "TBD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  const num = Number.parseFloat(amount.replace(/,/g, ""));
  if (Number.isNaN(num) || num === 0) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateRange(startsAt?: string, endsAt?: string): string {
  if (!startsAt || !endsAt) return "Ongoing";
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "Ongoing";

  if (startDate.getFullYear() !== endDate.getFullYear()) {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }
  const fmtNoYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fmtYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmtNoYear.format(startDate)} - ${fmtYear.format(endDate)}`;
}

export function ProgramCard({ program, communityId }: ProgramCardProps) {
  const fundingAmount = program.metadata?.programBudget ?? program.metadata?.maxGrantSize;
  const formattedFundingAmount = formatCurrency(fundingAmount);
  const hasFundingAmount = formattedFundingAmount !== "TBD";

  const status = getProgramStatus(program);
  const statusInfo = STATUS_CONFIG[status];
  const isApplyDisabled = !isProgramEnabled(program);
  const disabledReason = getProgramDisabledReason(program);

  const programDetailsURL = `/community/${communityId}/programs/${program.programId}`;
  const description =
    program.metadata?.shortDescription ||
    program.metadata?.description ||
    "No description available";

  return (
    <Link
      href={programDetailsURL}
      className="group flex h-full w-full flex-col gap-4 rounded-xl border border-border p-6 transition-all hover:shadow-lg"
    >
      {/* Header: Status Badge */}
      <div className="flex items-center justify-end gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Program Title */}
      <h3 className="text-xl font-semibold transition-all group-hover:opacity-80">
        {program.metadata?.title || program.name}
      </h3>

      {/* Description */}
      <p className="grow text-sm text-muted-foreground line-clamp-3">
        {description}
      </p>

      {/* Metadata */}
      <div className="flex flex-col border-t border-border pt-4">
        <div className="flex items-center justify-between py-3">
          <p className="text-sm text-muted-foreground">Application Period</p>
          <p className="text-base font-medium">
            {formatDateRange(program.metadata?.startsAt, program.metadata?.endsAt)}
          </p>
        </div>
        {hasFundingAmount ? (
          <>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between py-3">
              <p className="text-sm text-muted-foreground">Available Funding</p>
              <p className="text-base font-bold text-primary">
                {formattedFundingAmount}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Action */}
      {!isApplyDisabled ? (
        <div className="flex items-center justify-end gap-2 pt-2 text-sm font-semibold text-foreground">
          Get started <ChevronRight className="h-4 w-4" />
        </div>
      ) : null}

      {/* Helper text for disabled state */}
      {isApplyDisabled && disabledReason ? (
        <p className="text-center text-xs text-muted-foreground">
          {disabledReason}
        </p>
      ) : null}
    </Link>
  );
}
