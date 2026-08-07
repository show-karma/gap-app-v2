"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/Utilities/Button";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { useProjectStore } from "@/store";
import type { Grant } from "@/types/v2/grant";
import { parseProgramId } from "@/utilities/normalizeProgramId";
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
 * It has to be client-side and mounted here rather than in the route layout:
 * `communityId` / `programId` only exist once the grant store has hydrated,
 * and `applicationId` only after the funding-application lookup resolves.
 * `applicationId` is load-bearing — the backend grants the APPLICANT role (and
 * therefore `APPLICATION_COMMENT`) only when the resource context names an
 * application; community/program context alone leaves a grantee unable to
 * comment on their own thread.
 */
export function GrantCommentsPanel({ grant }: GrantCommentsPanelProps) {
  const storedProject = useProjectStore((state) => state.project);

  // The V2 grants mapper writes the same value to both `communityUID` and
  // `data.communityUID`; older payloads only carry one. Read both.
  const communityId = grant.communityUID || grant.data?.communityUID;
  // RAW composite id ("1013_42161") — the backend normalizes it when scoping
  // the application lookup, and the chain suffix is the only disambiguator
  // when a project holds grants from the same program on two chains.
  const rawProgramId = grant.programId || grant.details?.programId || undefined;
  // BASE id ("1013") — what program-scoped lookups key on.
  const programId = parseProgramId(rawProgramId);
  const projectUID = grant.projectUID || grant.project?.uid || storedProject?.uid || "";

  const { isAuthorized, isLoading: isAuthLoading } = useProjectAuthorization(communityId);
  const {
    application,
    isLoading: isApplicationLoading,
    error,
    refetch,
  } = useFundingApplicationByProjectUID(projectUID, rawProgramId);

  // Authorization is tri-state and the branch below depends on it; render the
  // skeleton rather than a branch that may be wrong for one paint.
  if (isAuthLoading || (!!projectUID && isApplicationLoading)) {
    return <GrantCommentsSkeleton />;
  }

  if (error) {
    // A private program 404s the anonymous lookup (degraded to `null` by the
    // service, so it never lands here), but any other failure must not surface
    // an error card to a logged-out visitor on a public page.
    if (!isAuthorized) return null;
    return (
      <div
        data-testid="grant-comments-error"
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <p className="mb-3 text-sm text-destructive">Failed to load comments.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // No linked funding application (grant created without one, or a private
  // program hiding it): there is no thread to show. Page is unchanged.
  if (!application?.referenceNumber) {
    return null;
  }

  return (
    <PermissionProvider
      key={`${grant.uid}-${application.referenceNumber}`}
      resourceContext={{
        communityId,
        programId,
        applicationId: application.referenceNumber,
      }}
    >
      <GrantCommentsSection
        referenceNumber={application.referenceNumber}
        communityId={communityId ?? ""}
        programId={programId}
        statusHistory={application.statusHistory}
      />
    </PermissionProvider>
  );
}
