"use client";

import { ManageLayoutShell } from "@/components/Manage/ManageLayoutShell";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";

/**
 * `communityId` arrives as a prop from the server manage layout rather than
 * from `useParams()`. See that layout for why: `useParams()` hands back every
 * param of the matched route, including the `[programId]`/`[reportId]` segment
 * the nested manage routes have no build-time sample for, which made this the
 * first CLIENT_HOOK_DYNAMIC read on the chain and stopped those routes from
 * prerendering.
 */
export function ManageLayoutClient({
  communityId,
  children,
}: {
  communityId: string;
  children: React.ReactNode;
}) {
  return (
    <PermissionProvider
      resourceContext={{
        communityId,
      }}
    >
      <ManageLayoutShell communityId={communityId}>{children}</ManageLayoutShell>
    </PermissionProvider>
  );
}
