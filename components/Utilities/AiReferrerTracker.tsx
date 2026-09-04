"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useEffect, useRef } from "react";
import { captureAiFirstTouch, getAiFirstTouchProps } from "@/utilities/aiReferrer";
import { track } from "@/utilities/analytics/client";

const GA_LANDING_EVENT = "ai_referral_landing";

/**
 * Mirrors the gating in app/layout.tsx — gtag only exists on the page when
 * <GoogleAnalytics> was rendered, so calling it elsewhere would be a no-op at
 * best and a console warning at worst.
 */
const isGoogleAnalyticsActive = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_GA_TRACKING_ID) && process.env.NEXT_PUBLIC_ENV === "production";

/**
 * Records the first-touch answer-engine attribution for this visitor, applies
 * it to Google Analytics for the whole page load, and emits one landing event
 * per capture. Renders nothing.
 *
 * Mounted once from `DeferredLayoutComponents` (root layout), so App Router
 * client navigations never re-run the capture — and `captureAiFirstTouch` is
 * write-once anyway, so a hard navigation cannot overwrite the original source.
 *
 * Mixpanel goes through `track` from the analytics client, which initializes
 * the SDK synchronously on first use — so a one-shot mount effect like this one
 * cannot race the init the way the old `useMixpanel` hook did.
 */
export function AiReferrerTracker() {
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    const { firstTouch, isNew } = captureAiFirstTouch();
    if (!firstTouch) return;

    const googleAnalyticsActive = isGoogleAnalyticsActive();

    if (googleAnalyticsActive) {
      // GA4 user properties are user-scoped and attach to every subsequent
      // event of the page load, including the pageviews of client navigations.
      // Mixpanel gets the same attribution per-event via `getAiFirstTouchProps`
      // inside the event helpers; without this `set`, GA would only ever see it
      // on the landing event below and a returning visitor's conversion could
      // not be traced back to the answer engine.
      sendGAEvent("set", "user_properties", getAiFirstTouchProps());
    }

    // Everything below reports the landing itself, which happens exactly once
    // per visitor — a returning visitor keeps the attribution above but must
    // not re-emit the landing.
    if (!isNew) return;

    const properties = {
      ai_source: firstTouch.source,
      ai_source_medium: firstTouch.medium,
      ai_landing_path: firstTouch.landingPath,
    };

    track("ai_referral_landing", properties);

    if (googleAnalyticsActive) {
      sendGAEvent("event", GA_LANDING_EVENT, properties);
    }
  }, []);

  return null;
}
