"use client";

import dynamic from "next/dynamic";
import pluralize from "pluralize";
import { memo } from "react";
import { Link } from "@/src/components/navigation/Link";
import type { ProjectWithGrantsResponse } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { computeProjectPendingActions, projectPendingHref } from "../utils/pending-actions";
import { EmptyState, ErrorState, Section } from "./primitives";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_OUTLINE, BTN_SM, badgeClasses, SK, THUMB_BASE } from "./soft-classes";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

interface ProjectsFullViewProps {
  projects: ProjectWithGrantsResponse[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function projectInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** "New project" / "Create project" — the soft-styled create dialog trigger. */
function NewProjectButton({ label }: { label: string }) {
  return (
    <ProjectDialog
      buttonElement={{
        text: label,
        icon: <SoftIcon name="plus" className="h-4 w-4" />,
        iconSide: "left",
        // `!shadow-none` (important) is required: the Button's default variant sets
        // the custom `shadow-primary-button`, which twMerge doesn't recognize as a
        // shadow-group conflict, so a plain `shadow-none` wouldn't win the cascade.
        styleClass: cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "!shadow-none"),
      }}
    />
  );
}

function ProjectSkeletonCard() {
  return (
    <div className="flex flex-col gap-[14px] rounded-sf-tile border border-sf-line bg-sf-elev p-4">
      <div className="flex items-center gap-3">
        <span className={cn(SK, "h-11 w-11 !rounded-[13px]")} />
        <span className={cn(SK, "h-[15px] w-[55%]")} />
      </div>
      <div className="flex gap-1.5">
        <span className={cn(SK, "h-[22px] w-24 !rounded-full")} />
        <span className={cn(SK, "h-[22px] w-16 !rounded-full")} />
      </div>
    </div>
  );
}

/** Shared hover affordance for badges that link out to the grants/funding tab. */
const BADGE_LINK_AFFORDANCE = "transition-opacity duration-150 hover:opacity-80";

/**
 * Pending-work badge for a project, mirroring the design's precedence. The
 * milestones-pending / grants-in-progress badges link through to the
 * project's funding tab (where the grants + milestones actually live);
 * "All caught up" has nothing to drill into, so it stays a plain span.
 */
function ProjectStatusBadge({
  project,
  slug,
}: {
  project: ProjectWithGrantsResponse;
  slug: string;
}) {
  const actions = computeProjectPendingActions(project);
  const { milestonesNeedingSubmission, grantsInProgress } = actions;
  // Deep-links to the single grant when the work is in one grant, else funding.
  const href = projectPendingHref(slug, actions);

  if (milestonesNeedingSubmission > 0) {
    return (
      <Link href={href} className={cn(badgeClasses("orange"), BADGE_LINK_AFFORDANCE)}>
        <SoftIcon name="send" className="h-3 w-3" />
        {milestonesNeedingSubmission} {pluralize("milestone", milestonesNeedingSubmission)} pending
      </Link>
    );
  }
  if (grantsInProgress > 0) {
    return (
      <Link href={href} className={cn(badgeClasses("blue"), BADGE_LINK_AFFORDANCE)}>
        <SoftIcon name="flag" className="h-3 w-3" />
        {grantsInProgress} {pluralize("grant", grantsInProgress)} in progress
      </Link>
    );
  }
  return (
    <span className={badgeClasses("green")}>
      <SoftIcon name="check" className="h-3 w-3" />
      All caught up
    </span>
  );
}

/** One project card — logo/initials, title, pending-work badge, grant count. */
const ProjectCard = memo(function ProjectCard({ project }: { project: ProjectWithGrantsResponse }) {
  const title = project.details?.title || "Untitled project";
  const slug = project.details?.slug || project.uid;
  const grantsCount = project.grants?.length ?? 0;
  return (
    <div className="flex flex-col gap-[14px] rounded-sf-tile border border-sf-line bg-sf-elev p-4 transition-[transform,border-color,background-color] duration-150 hover:-translate-y-[3px] hover:border-sf-line-strong hover:bg-sf-card">
      <Link href={PAGES.PROJECT.OVERVIEW(slug)} className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            THUMB_BASE,
            "h-11 w-11 rounded-[13px] text-sm font-[750] tracking-[-0.02em]"
          )}
        >
          {project.details?.logoUrl ? (
            <img src={project.details.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            projectInitials(title)
          )}
        </div>
        <span className="min-w-0 truncate text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">
          {title}
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <ProjectStatusBadge project={project} slug={slug} />
        {grantsCount > 0 ? (
          <Link
            href={PAGES.PROJECT.GRANTS(slug)}
            className={cn(badgeClasses("gray"), BADGE_LINK_AFFORDANCE)}
          >
            {grantsCount} total {pluralize("grant", grantsCount)}
          </Link>
        ) : null}
      </div>
    </div>
  );
});

/**
 * Project-owner drill-in — the design's "My projects" view. A soft card grid
 * over the dashboard's already-fetched projects, each showing a pending-work
 * badge and grant count, linking to the project overview. Renders loading,
 * empty, error, and ready states.
 */
export function ProjectsFullView({ projects, isLoading, isError, refetch }: ProjectsFullViewProps) {
  let body: React.ReactNode;
  if (isError) {
    body = <ErrorState message="Unable to load your projects." onRetry={() => refetch()} />;
  } else if (isLoading) {
    body = (
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <ProjectSkeletonCard />
        <ProjectSkeletonCard />
        <ProjectSkeletonCard />
        <ProjectSkeletonCard />
        <ProjectSkeletonCard />
      </div>
    );
  } else if (projects.length === 0) {
    body = (
      <EmptyState
        icon="rocket"
        title="No projects yet"
        body="Create a project to start tracking your grants and milestones on Karma."
        action={<NewProjectButton label="Create project" />}
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {projects.map((project) => (
          <ProjectCard key={project.uid} project={project} />
        ))}
      </div>
    );
  }

  const canCreate = !isLoading && !isError && projects.length > 0;

  return (
    <Section
      id="projects"
      icon="rocket"
      title="My projects"
      sub="Grants and milestones you own"
      action={canCreate ? <NewProjectButton label="New project" /> : null}
    >
      {body}
    </Section>
  );
}
