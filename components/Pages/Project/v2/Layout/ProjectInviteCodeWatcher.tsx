"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";

interface ProjectInviteCodeWatcherProps {
  /** Whether the modal has already been opened for this layout mount. */
  hasOpened: boolean;
  /** Called when this component opens the modal, so the caller can latch it. */
  onOpen: () => void;
}

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
 * The open-once guard deliberately lives in the CALLER, not here.
 * ProjectProfileLayout renders this from inside branch returns whose root
 * element type changes (a <div> while loading, an <ErrorBoundary> once the
 * project resolves), so React unmounts and remounts this component on that
 * transition. Local state would reset with it and re-open a modal the user had
 * just closed. Keeping the latch in the parent — which persists across those
 * branches — makes the behaviour independent of where this gets rendered.
 *
 * Returns null by design: this is an effect host, not UI. It fetches nothing,
 * so it has no loading/empty/error states to render.
 */
export function ProjectInviteCodeWatcher({ hasOpened, onOpen }: ProjectInviteCodeWatcherProps) {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite-code");
  const { openModal: openContributorProfileModal } = useContributorProfileModalStore();

  useEffect(() => {
    if (inviteCode && !hasOpened) {
      onOpen();
      openContributorProfileModal();
    }
  }, [inviteCode, hasOpened, onOpen, openContributorProfileModal]);

  return null;
}
