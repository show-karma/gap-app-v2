"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_DEFER_TIMEOUT_MS = 120_000;

interface DeferredGoogleAnalyticsProps {
  trackingId: string;
}

export function DeferredGoogleAnalytics({ trackingId }: DeferredGoogleAnalyticsProps) {
  const [enableAnalytics, setEnableAnalytics] = useState(() => process.env.NODE_ENV === "test");

  useEffect(() => {
    if (enableAnalytics) {
      return;
    }

    const interactionEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    const removeInteractionListeners = () => {
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, handleTrustedInteraction);
      }
    };
    const enableDeferredAnalytics = () => {
      setEnableAnalytics(true);
      removeInteractionListeners();
    };
    const handleTrustedInteraction = (event: Event) => {
      if (!event.isTrusted) return;
      enableDeferredAnalytics();
    };

    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, handleTrustedInteraction);
    }

    const timeoutId = window.setTimeout(enableDeferredAnalytics, GA_DEFER_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timeoutId);
      removeInteractionListeners();
    };
  }, [enableAnalytics]);

  if (!enableAnalytics) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${trackingId}');
        `}
      </Script>
    </>
  );
}
