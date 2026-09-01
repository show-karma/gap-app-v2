"use client";

import { MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import type { Grant } from "@/types/v2/grant";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GrantCommentsSkeleton } from "./GrantCommentsSkeleton";

/**
 * The comment surface transitively pulls a markdown editor and the mention
 * autocomplete, so it is code-split and only ever downloaded once the viewer
 * opens the sheet. Nothing here is fetched for a grant with no linked
 * application, nor for viewers who never open the panel.
 */
const GrantCommentsSection = dynamic(
  () => import("./GrantCommentsSection").then((mod) => mod.GrantCommentsSection),
  { loading: () => <GrantCommentsSkeleton /> }
);

interface GrantCommentsPanelProps {
  grant: Grant;
}

/**
 * Discreet entry point to the funding-application comment thread: a compact
 * trigger aligned to the side of the content column that opens the thread in a
 * right-hand sheet, so comments never displace the milestone list — while
 * still being present on grants with zero milestones (the case that motivated
 * this surface: a reviewer asking for milestones that don't exist yet).
 *
 * Mounts the RBAC context the grant subtree does not otherwise have.
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
  const [open, setOpen] = useState(false);

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
  // program hiding it): there is no thread to show, so no affordance either.
  if (!referenceNumber) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            data-testid="grant-comments-trigger"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Reviewer comments
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="text-base">Reviewer comments</SheetTitle>
            <SheetDescription className="text-[13px]">
              Conversation on this grant&apos;s funding application
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-5 py-4">
            {/* Authorization is tri-state and the branch inside depends on it;
                show the skeleton rather than a branch that may be wrong for
                one paint. Only ever reached with the sheet open. */}
            {isAuthLoading ? (
              <GrantCommentsSkeleton />
            ) : (
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
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
