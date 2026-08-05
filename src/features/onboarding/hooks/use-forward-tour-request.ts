"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { TOUR_QUERY_PARAM, withTourParam } from "../lib/tour-query";
import type { TourDefinition } from "../lib/tours";

/**
 * Hands a walkthrough request on to the page that can actually run it.
 *
 * The project-workspace tour points at things inside a single project, but the
 * chooser can only link somewhere it knows exists — the projects list. When a
 * request lands here and there is a project to open, it is forwarded to that
 * project carrying the request; when there isn't, the parameter is left alone
 * so the list's empty state does the teaching instead.
 */
export function useForwardTourRequest(tour: TourDefinition, destination: string | undefined): void {
  const router = useRouter();
  const hasForwarded = useRef(false);

  useEffect(() => {
    if (hasForwarded.current || !destination) return;
    if (typeof window === "undefined") return;

    const requested = new URLSearchParams(window.location.search).get(TOUR_QUERY_PARAM);
    if (requested !== tour.id) return;

    hasForwarded.current = true;
    router.replace(withTourParam(destination, tour.id));
  }, [router, tour, destination]);
}
