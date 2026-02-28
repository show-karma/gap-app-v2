"use client";

import { AlertCircle, FileText } from "lucide-react";
import type { ProgramListProps } from "../types";
import { ProgramCard } from "./ProgramCard";
import { ProgramCardSkeleton } from "./ProgramCardSkeleton";

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

export function ProgramList({
  programs,
  communityId,
  loading = false,
  error = null,
  viewMode = "grid",
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
        <p className="text-muted-foreground">{error.message}</p>
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
          There are currently no active programs in this community.
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
        {programs.map((program) => (
          <ProgramCard
            key={program.programId}
            program={program}
            communityId={communityId}
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div data-testid="programs-list" className="space-y-4">
      {programs.map((program) => (
        <ProgramCard
          key={program.programId}
          program={program}
          communityId={communityId}
        />
      ))}
    </div>
  );
}
