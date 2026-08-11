"use client";

import dynamic from "next/dynamic";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import type { Grant } from "@/types/v2/grant";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { GrantCommentsSkeleton } from "./GrantCommentsSkeleton";

/**
 * The comment surface transitively pulls a markdown editor and the mention
 * autocomplete, so it is code-split behind the same skeleton the tri-state
 * gate uses. Nothing here is downloaded for a grant with no linked
 * application.
 */
const GrantCommentsSection = dynamic(
  () => import("./GrantCommentsSection").then((mod) => mod.GrantCommentsSection),
  { loading: () => <GrantCommentsSkeleton /> }
);

interface GrantCommentsPanelProps {
  grant: Grant;
}

/**
 * Mounts the RBAC context the grant subtree does not otherwise have.
 *
 * `app/project/**` has no `PermissionProvider` anywhere in its layout chain —
 * the global `PermissionsProvider` (plural, `components/Utilities/`) only runs
 * `useContractOwner()` and provides no React context. Without this wrapper,
 * `can(APPLICATION_COMMENT)` reads the default context (`can: () => false`,
 * `isLoading: true` forever) and the comment surface silently never renders.
 *
 * `applicationId` is load-bearing — the backend grants the APPLICANT role (and
 * therefore `APPLICATION_COMMENT`) only when the resource context names an
 * application; community/program context alone leaves a grantee unable to
 * comment on their own thread.
 */
export function GrantCommentsPanel({ grant }: GrantCommentsPanelProps) {
  // The V2 grants mapper writes the same value to both `communityUID` and
  // `data.communityUID`; older payloads only carry one. Read both.
  const communityId = grant.communityUID || grant.data?.communityUID;
  // Grants carry the composite id ("1013_42161"); program-scoped lookups key
  // on the base form.
  const rawProgramId = grant.programId || grant.details?.programId;
  const programId = rawProgramId ? normalizeProgramId(rawProgramId) : undefined;
  const referenceNumber = grant.referenceNumber;

  const { isLoading: isAuthLoading } = useProjectAuthorization(communityId);

  // No linked funding application (grant created without one, or a private
  // program hiding it): there is no thread to show. Checked before the auth
  // gate because it comes off the payload synchronously — waiting on
  // authorization first would flash a skeleton on every grant that is never
  // going to render comments, which is most of them.
  if (!referenceNumber) {
    return null;
  }

  // Authorization is tri-state and the branch below depends on it; render the
  // skeleton rather than a branch that may be wrong for one paint.
  if (isAuthLoading) {
    return <GrantCommentsSkeleton />;
  }

  return (
    <PermissionProvider
      key={`${grant.uid}-${referenceNumber}`}
      resourceContext={{
        communityId,
        programId,
        applicationId: referenceNumber,
      }}
    >
      <GrantCommentsSection
        referenceNumber={referenceNumber}
        communityId={communityId ?? ""}
        programId={programId}
      />
    </PermissionProvider>
  );
}
