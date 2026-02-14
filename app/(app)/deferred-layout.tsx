"use client";

import dynamic from "next/dynamic";

export const DeferredToaster = dynamic(
  () => import("react-hot-toast").then((m) => ({ default: m.Toaster })),
  { ssr: false }
);

export const DeferredProgressBar = dynamic(
  () =>
    import("@/components/ProgressBarWrapper").then((m) => ({
      default: m.ProgressBarWrapper,
    })),
  { ssr: false }
);

export const DeferredFooter = dynamic(
  () => import("@/src/components/footer/footer").then((m) => ({ default: m.Footer })),
  { ssr: false }
);

export const DeferredAnalytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
  { ssr: false }
);
