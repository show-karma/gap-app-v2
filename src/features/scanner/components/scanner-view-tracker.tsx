"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/utilities/analytics/client";

interface ScannerViewTrackerProps {
  // 'public' = anonymous-tier /s/[slug] view, 'detail' = logged-in
  // /scanner/scans/[id] view. Same event; the variant distinguishes the
  // funnel step.
  readonly variant: "public" | "detail";
  readonly scanId: string | null;
  readonly slug: string | null;
  readonly grade?: string | null;
  readonly totalScore?: number | null;
  readonly viewerIsOwner?: boolean;
}

/**
 * Fires a single `scanner_scorecard_viewed` when a viewer lands on a scorecard.
 * Renders nothing.
 *
 * Who the viewer is stays off the event: the identity is already bound to the
 * Mixpanel profile by `AnalyticsProvider`, and this tracker used to put the
 * viewer's email on every scorecard view. Only whether they are signed in and
 * whether they own the scan — the two things the conversion funnel splits on —
 * are reported.
 */
export function ScannerViewTracker(props: ScannerViewTrackerProps) {
  const { variant, scanId, slug, grade, totalScore, viewerIsOwner } = props;
  const { ready, authenticated } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!ready) return;
    if (!scanId && !slug) return;
    firedRef.current = true;
    track("scanner_scorecard_viewed", {
      variant,
      scan_id: scanId ?? null,
      grade: grade ?? null,
      total_score: totalScore ?? null,
      viewer_is_owner: viewerIsOwner ?? false,
      viewer_is_authenticated: authenticated,
    });
  }, [ready, authenticated, scanId, slug, variant, grade, totalScore, viewerIsOwner]);

  return null;
}
