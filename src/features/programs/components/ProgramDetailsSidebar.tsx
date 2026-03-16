"use client";

import { ChevronRight } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { ProgramDetailsCard } from "./ProgramDetailsCard";

interface ProgramDetailsSidebarProps {
  program: FundingProgram;
  communityId: string;
  isEnabled: boolean;
}

function getProgramDisabledReason(program: FundingProgram): string {
  const isEnabled = program.applicationConfig?.isEnabled ?? false;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isDeadlinePassed = program.metadata?.endsAt
    ? new Date(program.metadata.endsAt) < new Date()
    : false;

  if (!hasFormConfig) return "Applications not yet available";
  if (!isEnabled) return "Applications are currently closed";
  if (isDeadlinePassed) return "Application deadline has passed";
  return "";
}

export function ProgramDetailsSidebar({
  program,
  communityId,
  isEnabled,
}: ProgramDetailsSidebarProps) {
  const programId = program.programId;
  const hasFormConfig = !!program.applicationConfig?.formSchema;
  const isPrivate = program.applicationConfig?.formSchema?.settings?.privateApplications;

  const programBudget = program.metadata?.programBudget;
  const fundingMin = program.metadata?.minGrantSize;
  const fundingMax = program.metadata?.maxGrantSize;
  const grantTypes = program.metadata?.grantTypes;
  const startsAt = program.metadata?.startsAt;
  const endsAt = program.metadata?.endsAt;

  const hasSomeDetails =
    !!programBudget ||
    !!fundingMin ||
    !!fundingMax ||
    (grantTypes?.length ?? 0) > 0 ||
    !!startsAt ||
    !!endsAt;

  const applyUrl = `/community/${communityId}/programs/${programId}/apply`;
  const applicationsUrl = `/community/${communityId}/browse-applications?programId=${programId}`;

  return (
    <aside
      aria-label="Program application and details"
      className="h-fit min-w-80 lg:sticky lg:top-4 lg:min-w-96"
    >
      <div className="rounded-xl bg-transparent p-0 shadow-none ring-0 md:p-8 md:shadow-sm md:ring-1 md:ring-border">
        {/* Apply Section */}
        <h2 className="mb-4 hidden text-3xl font-semibold text-muted-foreground md:block">Apply</h2>
        <div className="flex flex-row gap-2">
          {isEnabled ? (
            <Link
              href={applyUrl}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply now
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground opacity-50">
              {getProgramDisabledReason(program) || "Application closed"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          {hasFormConfig && !isPrivate ? (
            <Link
              href={applicationsUrl}
              className="flex flex-1 items-center justify-center rounded-lg border border-primary px-4 py-2.5 font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View applications
            </Link>
          ) : null}
        </div>

        {hasSomeDetails ? <hr className="my-8 border-border" /> : null}

        {/* Program Details Section */}
        <ProgramDetailsCard
          programBudget={programBudget}
          fundingMin={fundingMin}
          fundingMax={fundingMax}
          grantTypes={grantTypes}
          startsAt={startsAt}
          endsAt={endsAt}
        />
      </div>
    </aside>
  );
}
