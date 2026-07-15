"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAccessDeniedMessages } from "@/hooks/useAccessDeniedMessages";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { manageLayoutDenial } from "@/src/components/ui/access-denied-presets";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { useGranteeApplicationAccess } from "@/src/core/rbac/hooks/use-grantee-application-access";
import {
  ACCESS_DENIED_DEFAULT_MESSAGES,
  substituteAccessDeniedTemplate,
} from "@/utilities/accessDeniedTemplate";
import {
  type GranteeRedirect,
  getManageFundingPlatformPublicRedirect,
} from "@/utilities/fundingPlatformUrls";
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
  // routes programId/applicationId are available here.
  const { programId, applicationId } = useParams() as {
    programId?: string;
    applicationId?: string;
  };
  const pathname = usePathname();
  const { replace } = useRouter();
  const { ready, authenticated } = useAuth();
  const { isWhitelabel } = useWhitelabel();
  const [clientOrigin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  const whitelabelOrigin = isWhitelabel ? clientOrigin : undefined;

  // A failed permission lookup also lands here (roles default to guest). Treat
  // that as "undetermined", not a real denial — skip the applicant lookup so a
  // transient failure can't redirect a user who was never actually denied.
  const { isGuestDueToError } = usePermissionContext();

  // DEV-496: the /manage layout gate shadows the page-level FundingPlatformGuard
  // redirect, so an authenticated visitor without manage access who opened a
  // funding-platform review link is sent to the canonical public page from here.
  // A logged-out visitor keeps the denial (they must sign in first); a transient
  // permission-lookup failure is undetermined, so it never redirects.
  const publicRedirectTarget = getManageFundingPlatformPublicRedirect(
    { communityId, programId, applicationId },
    pathname,
    whitelabelOrigin
  );
  const isRedirectRoute = publicRedirectTarget !== null;
  const shouldRedirect = isRedirectRoute && ready && authenticated && !isGuestDueToError;
  // On a redirect route we can't tell "redirect" from "deny" until Privy is
  // ready, so wait on a spinner rather than flashing the denial to a signed-in user.
  const resolvingRedirect = isRedirectRoute && !isGuestDueToError && !ready;

  useEffect(() => {
    if (shouldRedirect && publicRedirectTarget) {
      replace(publicRedirectTarget);
    }
  }, [shouldRedirect, publicRedirectTarget, replace]);

  const grantee = useGranteeApplicationAccess({
    enabled: !isGuestDueToError && !shouldRedirect,
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

  // Signed-in visitor on a funding-platform route with a public equivalent: hold
  // a spinner while the redirect above resolves/fires so the denial never flashes.
  if (shouldRedirect || resolvingRedirect) {
    return (
      <div className="flex w-full items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

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
