"use client";

import dynamic from "next/dynamic";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { useOnboarding } from "@/store/modals/onboarding";

const ContributorProfileDialog = dynamic(
  () =>
    import("@/components/Dialogs/ContributorProfileDialog").then(
      (mod) => mod.ContributorProfileDialog
    ),
  { ssr: false }
);

const OnboardingDialog = dynamic(
  () => import("@/components/Dialogs/OnboardingDialog").then((mod) => mod.OnboardingDialog),
  { ssr: false }
);

/**
 * Conditionally render dialogs only when opened.
 *
 * HeadlessUI's Transition calls getComputedStyle() on mount even when
 * the dialog is closed, causing ~111ms of forced reflows. By deferring
 * the mount until the modal store says "open", we eliminate those
 * reflows from the initial page load and defer the JS chunk download.
 */
export function LazyDialogs() {
  const isContributorProfileOpen = useContributorProfileModalStore((s) => s.isModalOpen);
  const isOnboardingOpen = useOnboarding((s) => s.isOnboardingOpen);

  return (
    <>
      {isContributorProfileOpen && <ContributorProfileDialog />}
      {isOnboardingOpen && <OnboardingDialog />}
    </>
  );
}
