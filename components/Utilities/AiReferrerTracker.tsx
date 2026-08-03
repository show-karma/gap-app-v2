"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useEffect, useRef } from "react";
import { captureAiFirstTouch, getAiFirstTouchProps } from "@/utilities/aiReferrer";
import { mixpanelEvent } from "@/utilities/mixpanelEvent";

const MIXPANEL_LANDING_EVENT = "ai-referral-landing";
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
 * Uses the `mixpanelEvent` helper rather than the `useMixpanel` hook for the
 * same reason as `scanner-view-tracker`: the hook sets its Mixpanel instance in
 * an effect that races a one-shot mount effect, so the first event would no-op.
 * Both helpers are already no-ops outside production.
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

    void mixpanelEvent({ event: MIXPANEL_LANDING_EVENT, properties })?.catch(() => {
      // SUPPRESSED: a dropped analytics beacon must never surface to the user
      // or to Sentry. Mixpanel already retries its own queue.
    });

    if (googleAnalyticsActive) {
      sendGAEvent("event", GA_LANDING_EVENT, properties);
    }
  }, []);

  return null;
}
