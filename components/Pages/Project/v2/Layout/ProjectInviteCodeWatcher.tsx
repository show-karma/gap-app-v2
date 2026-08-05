"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";

/**
 * Opens the contributor-profile modal once when the URL carries an
 * `invite-code` query parameter.
 *
 * This is its own component, rendered inside a local <Suspense>, purely
 * because of `useSearchParams`. Reading search params anywhere in a subtree
 * that is not wrapped in Suspense opts that whole subtree into a client-side
 * rendering bailout. In `ProjectProfileLayout` the subtree in question is the
 * project's semantic identity shell — the sr-only h1, the sidebar name and
 * description, the profile navigation — which DEV-612 requires to be in the
 * server-rendered, no-JS-visible HTML. Confining the reader to a component
 * that renders nothing keeps the boundary off the identity shell and off the
 * tab-body boundary in `(profile)/layout.tsx`.
 *
 * Returns null by design: this is an effect host, not UI. It fetches nothing,
 * so it has no loading/empty/error states to render.
 */
export function ProjectInviteCodeWatcher() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite-code");
  const { openModal: openContributorProfileModal } = useContributorProfileModalStore();

  // Open at most once per mount, so closing the modal does not immediately
  // re-open it while `invite-code` is still in the URL.
  const [hasOpenedInviteModal, setHasOpenedInviteModal] = useState(false);

  useEffect(() => {
    if (inviteCode && !hasOpenedInviteModal) {
      setHasOpenedInviteModal(true);
      openContributorProfileModal();
    }
  }, [inviteCode, hasOpenedInviteModal, openContributorProfileModal]);

  return null;
}
