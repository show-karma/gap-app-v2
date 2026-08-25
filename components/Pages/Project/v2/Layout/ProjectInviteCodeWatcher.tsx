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
 * Isolated behind its own <Suspense> because `useSearchParams` bails the whole
 * enclosing subtree out to client rendering, and here that subtree is the
 * project's server-rendered identity shell (DEV-612).
 *
 * The open-once latch lives in the CALLER: ProjectProfileLayout renders this
 * from branch returns with different root element types, so React remounts it
 * when the project resolves and local state would reset, re-opening a modal the
 * user had closed.
 *
 * Returns null by design — an effect host, not UI.
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
