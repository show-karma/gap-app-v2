"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(() => import("react-hot-toast").then((mod) => mod.Toaster), { ssr: false });

const Analytics = dynamic(() => import("@vercel/analytics/react").then((mod) => mod.Analytics), {
  ssr: false,
});

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
);

const AgentChatBubble = dynamic(
  () => import("@/components/AgentChat/AgentChatBubble").then((mod) => mod.AgentChatBubble),
  { ssr: false }
);

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

const ApiKeyManagementModal = dynamic(
  () =>
    import("@/src/features/api-keys/components/api-key-management-modal").then(
      (mod) => mod.ApiKeyManagementModal
    ),
  { ssr: false }
);

const ProgressBarWrapper = dynamic(
  () => import("@/components/ProgressBarWrapper").then((mod) => mod.ProgressBarWrapper),
  { ssr: false }
);

const HotjarAnalytics = dynamic(() => import("@/components/Utilities/HotjarAnalytics"), {
  ssr: false,
});

interface DeferredLayoutComponentsProps {
  isWhitelabel: boolean;
  toasterConfig: {
    position: "top-right";
    toastOptions: Record<string, unknown>;
    containerStyle: Record<string, unknown>;
  };
}

export function DeferredLayoutComponents({
  isWhitelabel,
  toasterConfig,
}: DeferredLayoutComponentsProps) {
  return (
    <>
      <Toaster {...toasterConfig} />
      <ProgressBarWrapper />
      <Analytics />
      <SpeedInsights />
      <HotjarAnalytics />
      {!isWhitelabel && (
        <>
          <ContributorProfileDialog />
          <ApiKeyManagementModal />
          <OnboardingDialog />
        </>
      )}
      <AgentChatBubble />
    </>
  );
}
