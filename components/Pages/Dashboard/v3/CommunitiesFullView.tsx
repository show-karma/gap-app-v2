"use client";

import dynamic from "next/dynamic";
import pluralize from "pluralize";
import { useDashboardAdmin } from "@/hooks/useDashboardAdmin";
import { Link } from "@/src/components/navigation/Link";
import { cn } from "@/utilities/tailwind";
import { EmptyState, ErrorState, Section } from "./primitives";
import { SoftIcon } from "./SoftIcon";
import { BTN_BASE, BTN_OUTLINE, BTN_SM, SK, THUMB_BASE } from "./soft-classes";

const CommunityDialog = dynamic(
  () => import("@/components/Dialogs/CommunityDialog").then((mod) => mod.CommunityDialog),
  { ssr: false }
);

/** Shared hover affordance for the count lines that link out to a community's queues. */
const COUNT_LINK_AFFORDANCE =
  "w-fit text-sf-muted underline-offset-2 transition-colors hover:text-sf-heading hover:underline";

function communityInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** "New community" / "Create community" — the soft-styled create dialog trigger. */
function NewCommunityButton({ label, onCreated }: { label: string; onCreated: () => void }) {
  return (
    <CommunityDialog
      buttonElement={{
        text: label,
        icon: <SoftIcon name="plus" className="h-4 w-4" />,
        iconSide: "left",
        // `!shadow-none` (important) is required: the Button's default variant sets
        // the custom `shadow-primary-button`, which twMerge doesn't recognize as a
        // shadow-group conflict, so a plain `shadow-none` wouldn't win the cascade.
        styleClass: cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "!shadow-none"),
      }}
      refreshCommunities={async () => {
        onCreated();
      }}
    />
  );
}

function CommunitySkeletonCard() {
  return (
    <div className="flex flex-col gap-[14px] rounded-sf-tile border border-sf-line bg-sf-elev p-4">
      <div className="flex items-center gap-3">
        <span className={cn(SK, "h-11 w-11 !rounded-[13px]")} />
        <span className={cn(SK, "h-[15px] w-[55%]")} />
      </div>
      <span className={cn(SK, "h-[11px] w-[70%]")} />
      <span className={cn(SK, "h-[11px] w-[50%]")} />
      <span className={cn(SK, "h-9 w-24 !rounded-full")} />
    </div>
  );
}

/**
 * Community-admin drill-in — the design's "My communities" view. A soft card
 * grid over useDashboardAdmin, with active-program / pending-application counts
 * and a Manage link per community. Renders loading, empty, error, and ready.
 */
export function CommunitiesFullView() {
  const { communities, isLoading, isError, refetch } = useDashboardAdmin();
  const onCreated = () => {
    refetch();
  };

  let body: React.ReactNode;
  if (isError) {
    body = <ErrorState message="Unable to load your communities." onRetry={() => refetch()} />;
  } else if (isLoading) {
    body = (
      <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(206px,1fr))]">
        <CommunitySkeletonCard />
        <CommunitySkeletonCard />
      </div>
    );
  } else if (communities.length === 0) {
    body = (
      <EmptyState
        icon="users"
        title="No communities yet"
        body="Create your first community to start managing funding programs and applications."
        action={<NewCommunityButton label="Create community" onCreated={onCreated} />}
      />
    );
  } else {
    body = (
      <div className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(206px,1fr))]">
        {communities.map((c) => (
          <div
            className="flex flex-col gap-[14px] rounded-sf-tile border border-sf-line bg-sf-elev p-4"
            key={c.uid}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  THUMB_BASE,
                  "h-11 w-11 rounded-[13px] text-sm font-[750] tracking-[-0.02em]"
                )}
              >
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  communityInitials(c.name)
                )}
              </div>
              <span className="min-w-0 truncate text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">
                {c.name}
              </span>
            </div>
            <div className="flex flex-col gap-[3px] text-[12.5px] text-sf-muted">
              {c.activeProgramsCount > 0 ? (
                <Link href={`${c.manageUrl}/funding-platform`} className={COUNT_LINK_AFFORDANCE}>
                  {c.activeProgramsCount} active {pluralize("program", c.activeProgramsCount)}
                </Link>
              ) : null}
              {c.pendingApplicationsCount > 0 ? (
                <Link href={`${c.manageUrl}/funding-platform`} className={COUNT_LINK_AFFORDANCE}>
                  {c.pendingApplicationsCount} pending{" "}
                  {pluralize("application", c.pendingApplicationsCount)}
                </Link>
              ) : null}
            </div>
            <Link className={cn(BTN_BASE, BTN_SM, BTN_OUTLINE, "self-start")} href={c.manageUrl}>
              Manage
            </Link>
          </div>
        ))}
      </div>
    );
  }

  const canCreate = !isLoading && !isError && communities.length > 0;

  return (
    <Section
      id="communities"
      icon="users"
      title="My communities"
      sub="Programs and applications you administer"
      action={canCreate ? <NewCommunityButton label="New community" onCreated={onCreated} /> : null}
    >
      {body}
    </Section>
  );
}
