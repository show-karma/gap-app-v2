"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mixpanelEvent } from "@/utilities/mixpanelEvent";

interface ScannerViewTrackerProps {
  // 'public' = anonymous-tier /s/[slug] view, 'detail' = logged-in
  // /scanner/scans/[id] view. Same event family; the variant
  // distinguishes the funnel step.
  readonly variant: "public" | "detail";
  readonly scanId: string | null;
  readonly slug: string | null;
  readonly grade?: string | null;
  readonly totalScore?: number | null;
  readonly orgName?: string | null;
  readonly viewerIsOwner?: boolean;
}

// Fires a single mixpanel event when a viewer lands on a scorecard.
// Renders nothing. Uses the synchronous mixpanelEvent helper (which
// initializes Mixpanel on demand) rather than the useMixpanel hook —
// useMixpanel sets the Mixpanel instance via an effect that races with
// this component's effect on first mount, so a one-shot tracker that
// fires on mount would no-op the first event. mixpanelEvent itself is
// a no-op when NEXT_PUBLIC_MIXPANEL_KEY/ENV are not set.
export function ScannerViewTracker(props: ScannerViewTrackerProps) {
  const { variant, scanId, slug, grade, totalScore, orgName, viewerIsOwner } = props;
  const { ready, authenticated, user } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!ready) return;
    if (!scanId && !slug) return;
    firedRef.current = true;
    void mixpanelEvent({
      event: variant === "public" ? "scanner:public-scorecard-view" : "scanner:scan-detail-view",
      properties: {
        scanId: scanId ?? null,
        slug: slug ?? null,
        grade: grade ?? null,
        totalScore: totalScore ?? null,
        orgName: orgName ?? null,
        viewerIsAuthenticated: authenticated,
        viewerUserId: authenticated ? (user?.id ?? null) : null,
        viewerEmail: authenticated ? (user?.email?.address ?? null) : null,
        viewerIsOwner: viewerIsOwner ?? false,
      },
    });
  }, [
    ready,
    authenticated,
    scanId,
    slug,
    variant,
    grade,
    totalScore,
    orgName,
    viewerIsOwner,
    user?.id,
    user?.email?.address,
  ]);

  return null;
}
