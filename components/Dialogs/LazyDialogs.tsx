"use client";

import dynamic from "next/dynamic";

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

export function LazyDialogs() {
  return (
    <>
      <ContributorProfileDialog />
      <OnboardingDialog />
    </>
  );
}
