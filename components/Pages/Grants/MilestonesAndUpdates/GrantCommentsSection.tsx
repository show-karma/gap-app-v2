"use client";

import { useIsFundingPlatformAdmin } from "@/src/core/rbac/components/funding-platform-guard";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import { CommentTimeline } from "@/src/features/application-comments/components/CommentTimeline";
import { PublicComments } from "@/src/features/application-comments/components/PublicComments";
import type { StatusHistoryItem } from "@/src/features/application-comments/types";
import { useProgram } from "@/src/features/programs/hooks/use-program";
import { GrantCommentsSkeleton } from "./GrantCommentsSkeleton";

/**
 * The grants payload carries no status history, and this surface is about the
 * comment thread rather than the application's review trail.
 */
const NO_STATUS_HISTORY: StatusHistoryItem[] = [];

interface GrantCommentsSectionProps {
  /** Funding application reference number, e.g. `APP-00012-00003`. */
  referenceNumber: string;
  /** Community UID the grant belongs to. */
  communityId: string;
  /**
   * BASE program id (`"1013"`, never `"1013_42161"`). `useProgram` and the
   * reviewer/mention lookups key on the base form.
   */
  programId?: string;
}

/**
 * The grant recipient's view of the funding-application comment thread,
 * surfaced on the project page so a grantee can read and answer milestone
 * reviewers without navigating to the community application page.
 *
 * Branching mirrors `ApplicationPageClient` exactly — one code path, one
 * mental model, so the same viewer sees the same thread in both places:
 *
 * 1. `APPLICATION_COMMENT` -> the full authenticated timeline.
 * 2. otherwise, `showCommentsOnPublicPage` -> the public read/write stream.
 * 3. otherwise -> no comments surface at all.
 *
 * Both permissions and the program config are tri-state; rendering a branch
 * before they resolve would flash the public stream at an owner (or the
 * reverse), so undecided renders a skeleton.
 */
export function GrantCommentsSection({
  referenceNumber,
  communityId,
  programId,
}: GrantCommentsSectionProps) {
  const { can, isLoading: isPermissionsLoading } = usePermissionContext();
  const isAdmin = useIsFundingPlatformAdmin();
  const { program, loading: isProgramLoading } = useProgram(programId ?? "");

  // `useProgram` is disabled without an id, and a disabled React Query v5 query
  // reports `isLoading === false` — so only treat it as pending when it can run.
  const isResolving = isPermissionsLoading || (!!programId && isProgramLoading);

  if (isResolving) {
    return <GrantCommentsSkeleton />;
  }

  const canUseComments = can(Permission.APPLICATION_COMMENT);
  const showPublicComments =
    !canUseComments && !!program?.applicationConfig?.formSchema?.settings?.showCommentsOnPublicPage;

  if (canUseComments) {
    return (
      <div id="grant-comments" data-testid="grant-comments-timeline">
        <CommentTimeline
          applicationId={referenceNumber}
          statusHistory={NO_STATUS_HISTORY}
          communityId={communityId}
          // "Activity" is the application page's framing. Here the card sits
          // above a milestone list, and the grantee arrives looking for what
          // reviewers asked about their milestone reports — name that.
          title="Reviewer comments"
        />
      </div>
    );
  }

  if (showPublicComments) {
    return (
      <div id="grant-comments" data-testid="grant-comments-public">
        <PublicComments
          referenceNumber={referenceNumber}
          communityId={communityId}
          // Mentions are an admin affordance: `CommentInput` enables them on
          // `!!programId` and then fires reviewer/grantee-contact fetches that
          // 403 for every ordinary visitor on a public page.
          programId={isAdmin ? programId : undefined}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // Deliberate terminal branch: the viewer cannot comment and the program has
  // not opted into a public stream. This now renders inside an opened sheet,
  // so an honest quiet message beats an empty panel.
  return (
    <p
      data-testid="grant-comments-private"
      className="text-sm leading-relaxed text-muted-foreground"
    >
      Comments on this application aren&apos;t public. Reviewers and the grantee can see the
      conversation once they sign in.
    </p>
  );
}
