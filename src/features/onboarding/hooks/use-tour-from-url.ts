"use client";

import { useEffect, useRef } from "react";
import { stripTourParam, TOUR_QUERY_PARAM } from "../lib/tour-query";
import type { TourDefinition } from "../lib/tours";
import { useTour } from "./use-tour";

/**
 * Starts `tour` when the page was opened with `?tour=<its id>` — the link the
 * profile-menu chooser builds when the requested walkthrough lives on a
 * different page than the one the user is on.
 *
 * `ready` lets the surface hold the request until the elements the tour points
 * at are actually rendered; on find-funders, for instance, the results and tray
 * steps don't exist until a search has returned.
 *
 * The parameter is read from `window.location` inside the effect rather than
 * through `useSearchParams`, which would opt every page hosting a tour into a
 * Suspense boundary for a value only needed once, on the client, after mount.
 */
export function useTourFromUrl(tour: TourDefinition, ready = true): void {
  const { startTour, canRunTours } = useTour();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current || !ready || !canRunTours) return;
    if (typeof window === "undefined") return;

    const requested = new URLSearchParams(window.location.search).get(TOUR_QUERY_PARAM);
    if (requested !== tour.id) return;

    hasStarted.current = true;
    stripTourParam();
    // Explicitly requested, so it runs whether or not it has been seen before.
    void startTour(tour);
  }, [ready, canRunTours, startTour, tour]);
}
