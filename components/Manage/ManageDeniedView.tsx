"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useAccessDeniedMessages } from "@/hooks/useAccessDeniedMessages";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { manageLayoutDenial } from "@/src/components/ui/access-denied-presets";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useGranteeApplicationAccess } from "@/src/core/rbac/hooks/use-grantee-application-access";
import {
  ACCESS_DENIED_DEFAULT_MESSAGES,
  substituteAccessDeniedTemplate,
} from "@/utilities/accessDeniedTemplate";
import type { GranteeRedirect } from "@/utilities/fundingPlatformUrls";
import { PAGES } from "@/utilities/pages";
import { useWhitelabel } from "@/utilities/whitelabel-context";

interface ManageDeniedViewProps {
  communityId: string;
  communityName?: string;
}

const CTA_LABEL: Record<GranteeRedirect["kind"], string> = {
  application: "View your application",
  dashboard: "Go to your dashboard",
};

/**
 * Shown when a signed-in user lacks manage access to a community. The standard
 * "needs a role" denial always renders; if the user is also an applicant
 * (grantee) of this community/program, a complementary link to their own
 * application is added below it. The lookup mounts only on denial, so it never
 * runs for users who have manage access.
 */
export function ManageDeniedView({ communityId, communityName }: ManageDeniedViewProps) {
  // useParams returns the full matched route's params, so on funding-platform
  // routes programId is available here to scope the lookup to that program.
  const { programId } = useParams() as { programId?: string };
  const { isWhitelabel } = useWhitelabel();
  const [clientOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  const whitelabelOrigin = isWhitelabel ? clientOrigin : undefined;

  // A failed permission lookup also lands here (roles default to guest). Treat
  // that as "undetermined", not a real denial — skip the applicant lookup so a
  // transient failure can't redirect a user who was never actually denied.
  const { isGuestDueToError } = usePermissionContext();

  const grantee = useGranteeApplicationAccess({
    enabled: !isGuestDueToError,
    communityId,
    programId,
    whitelabelOrigin,
  });

  // Per-community applicant copy (configurable on the Access Denied page),
  // falling back to the Karma default. Same public endpoint AccessDenied
  // already reads, so React Query dedupes the request.
  const { data: messages } = useAccessDeniedMessages(communityId);
  const applicantMessage = substituteAccessDeniedTemplate(
    messages?.applicantMessage ?? ACCESS_DENIED_DEFAULT_MESSAGES.applicant,
    {
      communityName: communityName ?? "this community",
      communitySlug: communityId,
      appUrl: "",
      requiredRoles: "",
      currentRoles: null,
    }
  );

  // Complementary action — the denial message stays; this is added when the
  // denied user turns out to be an applicant. It simply pops in once the lookup
  // resolves, so there's no denial flash to guard against.
  const secondaryAction =
    grantee.isGrantee && !grantee.isError
      ? {
          label: CTA_LABEL[grantee.redirect.kind],
          href: grantee.redirect.url,
          message: applicantMessage,
        }
      : undefined;

  return (
    <AccessDenied
      {...manageLayoutDenial(communityName)}
      communitySlug={communityId}
      communityName={communityName}
      cta={{ label: "Go to Community", href: PAGES.COMMUNITY.ALL_GRANTS(communityId) }}
      secondaryAction={secondaryAction}
    />
  );
}
