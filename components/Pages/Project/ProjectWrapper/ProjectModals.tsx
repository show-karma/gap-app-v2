"use client";

import dynamic from "next/dynamic";
import { ProjectOptionsDialogs } from "@/components/Pages/Project/ProjectOptionsMenu";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { useProgressModalStore } from "@/store/modals/progress";
import { useShareDialogStore } from "@/store/modals/shareDialog";

/**
 * Dynamic imports for modal components.
 * Modals are loaded only when their trigger state becomes true,
 * reducing initial bundle size by ~50-80KB.
 */
const IntroDialog = dynamic(() => import("../IntroDialog").then((mod) => mod.IntroDialog), {
  ssr: false,
});

const EndorsementDialog = dynamic(
  () =>
    import("@/components/Pages/Project/Impact/EndorsementDialog").then(
      (mod) => mod.EndorsementDialog
    ),
  { ssr: false }
);

const ProgressDialog = dynamic(
  () => import("@/components/Dialogs/ProgressDialog").then((mod) => mod.ProgressDialog),
  { ssr: false }
);

const ShareDialog = dynamic(
  () =>
    import("../../GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/ShareDialog").then(
      (mod) => mod.ShareDialog
    ),
  { ssr: false }
);

const ContributorProfileDialog = dynamic(
  () =>
    import("@/components/Dialogs/ContributorProfileDialog").then(
      (mod) => mod.ContributorProfileDialog
    ),
  { ssr: false }
);

/**
 * ProjectModals - Consolidates all modal components for the project page.
 *
 * This component manages the rendering of modals based on their respective
 * store states. Each modal is lazily loaded via dynamic imports to reduce
 * the initial bundle size.
 *
 * Modals included:
 * - IntroDialog: Project introduction/onboarding modal
 * - EndorsementDialog: Impact endorsement modal
 * - ProgressDialog: Progress/loading state modal
 * - ShareDialog: Social sharing modal
 * - ContributorProfileDialog: Invite member/contributor profile modal
 * - ProjectOptionsDialogs: Project edit, merge, transfer ownership, and grant genie modals
 */
export const ProjectModals = () => {
  const { isIntroModalOpen } = useIntroModalStore();
  const { isEndorsementOpen } = useEndorsementStore();
  const { isProgressModalOpen } = useProgressModalStore();
  const { isOpen: isShareDialogOpen } = useShareDialogStore();
  const { isModalOpen: isContributorProfileOpen } = useContributorProfileModalStore();

  // Note: Invite-code detection is handled by ProjectProfileLayout (v2 layout).
  // This v1 component no longer handles invite-code auto-open.

  return (
    <>
      {isIntroModalOpen ? <IntroDialog /> : null}
      {isEndorsementOpen ? <EndorsementDialog /> : null}
      {isProgressModalOpen ? <ProgressDialog /> : null}
      {isShareDialogOpen ? <ShareDialog /> : null}
      {isContributorProfileOpen ? <ContributorProfileDialog /> : null}
      {/* Project options dialogs - rendered once here to avoid duplicate modals */}
      <ProjectOptionsDialogs />
    </>
  );
};
