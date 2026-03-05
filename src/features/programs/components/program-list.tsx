"use client";

import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { FundingMapCard } from "@/src/features/funding-map/components/funding-map-card";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import type { FundingProgram } from "@/types/whitelabel-entities";
import { PAGES } from "@/utilities/pages";
import type { ProgramListProps } from "../types";
import { ProgramCardSkeleton } from "./ProgramCardSkeleton";

function toFundingProgramResponse(p: FundingProgram): FundingProgramResponse {
  return {
    _id: p.programId,
    programId: p.programId,
    chainID: p.chainID,
    metadata: p.metadata,
    isOnKarma: true,
    isValid: true,
    createdAt: "",
    updatedAt: "",
  };
}

type ProgramStatus = "open" | "closed" | "coming-soon" | "deadline-passed";

const STATUS_STYLES: Record<ProgramStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  "coming-soon": {
    label: "Coming Soon",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  "deadline-passed": {
    label: "Ended",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

function getProgramStatus(program: FundingProgram): ProgramStatus {
  const now = new Date();
  const startsAt = program.metadata?.startsAt ? new Date(program.metadata.startsAt) : null;
  const endsAt = program.metadata?.endsAt ? new Date(program.metadata.endsAt) : null;

  if (endsAt && now > endsAt) return "deadline-passed";
  if (startsAt && now < startsAt) return "coming-soon";
  if (program.metadata?.status === "inactive") return "closed";
  return "open";
}

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

export function ProgramList({
  programs,
  communityId,
  loading = false,
  error = null,
  viewMode = "grid",
  onRetry,
}: ProgramListProps) {
  // Loading state
  if (loading) {
    return (
      <div data-testid="programs-loading">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <ProgramCardSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-border py-12 text-center">
        <AlertCircle className="mx-auto mb-2 h-12 w-12 text-destructive" />
        <h3 className="mb-1 text-lg font-semibold">Failed to load programs</h3>
        <p className="mb-4 text-muted-foreground">
          Something went wrong while loading programs. Please try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (programs.length === 0) {
    return (
      <div className="rounded-xl border border-border py-12 text-center">
        <FileText className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-semibold">No programs available</h3>
        <p className="text-muted-foreground">
          There are currently no active programs in this community. Check back later for new funding
          opportunities.
        </p>
      </div>
    );
  }

  // Grid view (default)
  if (viewMode === "grid") {
    return (
      <div
        data-testid="programs-grid"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {programs.map((program) => {
          const status = getProgramStatus(program);
          const { label, className } = STATUS_STYLES[status];
          return (
            <FundingMapCard
              key={program.programId}
              program={toFundingProgramResponse(program)}
              href={PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId)}
              statusSlot={
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
                  {label}
                </span>
              }
            />
          );
        })}
      </div>
    );
  }

  // List view
  return (
    <div data-testid="programs-list" className="space-y-4">
      {programs.map((program) => {
        const status = getProgramStatus(program);
        const { label, className } = STATUS_STYLES[status];
        return (
          <FundingMapCard
            key={program.programId}
            program={toFundingProgramResponse(program)}
            href={PAGES.COMMUNITY.PROGRAM_DETAIL(communityId, program.programId)}
            statusSlot={
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
                {label}
              </span>
            }
          />
        );
      })}
    </div>
  );
}
