"use client";

import { CheckCircle2, Flag, Send } from "lucide-react";
import Link from "next/link";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { Badge } from "@/components/ui/badge";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";
import { computeProjectPendingActions } from "../utils/pending-actions";

interface DashboardProjectCardProps {
  project: ProjectWithGrantsResponse;
}

export function DashboardProjectCard({ project }: DashboardProjectCardProps) {
  const pendingActions = computeProjectPendingActions(project);
  const projectTitle = project.details?.title || "Untitled project";
  const projectSlug = project.details?.slug || project.uid;
  const grantsCount = project.grants?.length ?? 0;

  const hasActions =
    pendingActions.milestonesNeedingSubmission > 0 || pendingActions.grantsInProgress > 0;

  return (
    <Link
      href={PAGES.PROJECT.OVERVIEW(projectSlug)}
      className="flex h-full flex-col gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <ProfilePicture
          imageURL={project.details?.logoUrl}
          name={projectTitle}
          size="40"
          className="h-10 w-10 min-h-10 min-w-10 border border-border"
          alt={projectTitle}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{projectTitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasActions ? (
          <>
            {pendingActions.milestonesNeedingSubmission > 0 ? (
              <Badge
                variant="outline"
                className="gap-1 border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <Send className="h-3 w-3" />
                {pendingActions.milestonesNeedingSubmission}{" "}
                {pendingActions.milestonesNeedingSubmission === 1 ? "milestone" : "milestones"}{" "}
                pending
              </Badge>
            ) : null}
            {pendingActions.grantsInProgress > 0 ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <Flag className="h-3 w-3" />
                {pendingActions.grantsInProgress}{" "}
                {pendingActions.grantsInProgress === 1 ? "grant" : "grants"} to complete
              </Badge>
            ) : null}
          </>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            All caught up
          </Badge>
        )}
        <Badge variant="outline">
          {grantsCount} {grantsCount === 1 ? "grant" : "grants"}
        </Badge>
      </div>
    </Link>
  );
}
