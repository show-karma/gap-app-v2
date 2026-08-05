"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { trackTourCompleted, trackTourDismissed, trackTourStarted } from "../lib/analytics";
import { runTour } from "../lib/run-tour";
import { markCompleted, markDismissed, shouldAutoShow } from "../lib/storage";
import { surfaceFor, type TourDefinition } from "../lib/tours";
import { useOnboardingScope } from "./use-onboarding-scope";

export interface StartTourOptions {
  /**
   * True for a tour the app offers on its own. Automatic runs respect the
   * user's history; an explicit request (the profile menu, the help button) is
   * always honoured.
   */
  auto?: boolean;
  /** Control that opened the tour, so focus can return to it afterwards. */
  trigger?: HTMLElement | null;
}

export interface UseTourResult {
  startTour: (tour: TourDefinition, options?: StartTourOptions) => Promise<void>;
  /** False while auth is settling, and on tenant deployments. */
  canRunTours: boolean;
}

/**
 * Tours are gated off whitelabel tenants: those deployments carry their own
 * chrome and their own enabled features, so a walkthrough written against the
 * main app can point at things a tenant doesn't have.
 */
export function useTour(): UseTourResult {
  const { scope, isReady, isAuthenticated } = useOnboardingScope();
  const { isWhitelabel } = useWhitelabel();
  // A tour already on screen must not be started again — an auto-run landing on
  // top of a user-initiated one would leave two overlays fighting for the page.
  const isRunning = useRef(false);

  const canRunTours = isReady && !isWhitelabel;

  const startTour = useCallback(
    async (tour: TourDefinition, options: StartTourOptions = {}) => {
      if (!canRunTours || isRunning.current) return;

      const surface = surfaceFor(tour);
      if (options.auto && !shouldAutoShow(scope, surface)) return;

      const userId = isAuthenticated ? scope : undefined;
      isRunning.current = true;
      trackTourStarted({ userId, tour: tour.id, version: tour.version });

      try {
        const outcome = await runTour(tour, { returnFocusTo: options.trigger });

        if (outcome.status === "completed") {
          markCompleted(scope, surface);
          trackTourCompleted({
            userId,
            tour: tour.id,
            version: tour.version,
            steps: tour.steps.length,
          });
        } else if (outcome.status === "dismissed") {
          markDismissed(scope, surface);
          trackTourDismissed({
            userId,
            tour: tour.id,
            version: tour.version,
            atStep: outcome.atStep,
          });
        }
        // `unavailable` is deliberately not persisted: nothing was shown, so
        // the tour should still be offered once its anchors are back.
      } finally {
        isRunning.current = false;
      }
    },
    [canRunTours, isAuthenticated, scope]
  );

  return { startTour, canRunTours };
}

/**
 * Offers a tour once `enabled` turns true — used for the runs that fire on
 * their own (first results rendered, first project created) rather than from a
 * button. Fires at most once per mount; `shouldAutoShow` decides whether it
 * reaches the screen.
 */
export function useAutoTour(tour: TourDefinition, enabled: boolean): void {
  const { startTour, canRunTours } = useTour();
  const hasOffered = useRef(false);

  useEffect(() => {
    if (!enabled || !canRunTours || hasOffered.current) return;
    hasOffered.current = true;
    void startTour(tour, { auto: true });
  }, [enabled, canRunTours, startTour, tour]);
}
