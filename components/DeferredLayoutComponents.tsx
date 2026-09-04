"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { isAskKarmaPathname } from "@/utilities/pages";

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

const AiReferrerTracker = dynamic(
  () => import("@/components/Utilities/AiReferrerTracker").then((mod) => mod.AiReferrerTracker),
  { ssr: false }
);

const AnalyticsProvider = dynamic(
  () => import("@/components/Utilities/AnalyticsProvider").then((mod) => mod.AnalyticsProvider),
  { ssr: false }
);

interface DeferredLayoutComponentsProps {
  toasterConfig: {
    position: "top-right";
    toastOptions: Record<string, unknown>;
    containerStyle: Record<string, unknown>;
  };
}

/**
 * The one URL-dependent thing in this cluster, kept in its own leaf so the
 * `usePathname()` read cannot reach the rest of it.
 *
 * The ask-karma page is itself a full-screen chat surface; the floating bubble
 * would be a redundant second entry point sharing the same Zustand store, and
 * would mirror whatever conversation is happening on the page. Hide it on
 * ask-karma routes only.
 */
function AgentChatBubbleSlot() {
  const isAskKarmaRoute = isAskKarmaPathname(usePathname() ?? "");

  return isAskKarmaRoute ? null : <AgentChatBubble />;
}

export function DeferredLayoutComponents({ toasterConfig }: DeferredLayoutComponentsProps) {
  // Every dialog below subscribes to a Zustand store and is opened by
  // navbar UI that renders on every domain (whitelabel and non-whitelabel).
  // They MUST be mounted unconditionally — gating the mount on isWhitelabel
  // is what caused the profile-modal bug at app.filpgf.io (see issue
  // "fix-profile-on-app-filpgf"). The dialogs are loaded via next/dynamic
  // with ssr:false, so the chunk cost is paid only when first rendered.
  //
  // The bubble slot is the only member that reads the URL, and it sits behind
  // its own <Suspense> boundary: an unguarded `usePathname()` here is a URL
  // read in the App Shell, which under cacheComponents makes every route
  // dynamic. Everything in this cluster is `ssr: false`, so the boundary hides
  // nothing from a crawler and DEV-612's no-JS visibility rule does not apply —
  // the fallback is `null` because the bubble renders nothing on the server
  // either way.
  return (
    <>
      <Toaster {...toasterConfig} />
      <ProgressBarWrapper />
      <Analytics />
      <SpeedInsights />
      <HotjarAnalytics />
      <AiReferrerTracker />
      <AnalyticsProvider />
      <ContributorProfileDialog />
      <ApiKeyManagementModal />
      <OnboardingDialog />
      <Suspense fallback={null}>
        <AgentChatBubbleSlot />
      </Suspense>
    </>
  );
}
