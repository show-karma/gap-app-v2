"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMixpanel } from "@/hooks/useMixpanel";

interface ScannerViewTrackerProps {
  // 'public' = anonymous-tier /s/[slug] view, 'detail' = logged-in
  // /scanner/scans/[id] view. Same event name; the variant distinguishes
  // the funnel step.
  readonly variant: "public" | "detail";
  readonly scanId: string | null;
  readonly slug: string | null;
  readonly grade?: string | null;
  readonly totalScore?: number | null;
  readonly orgName?: string | null;
  readonly viewerIsOwner?: boolean;
}

// Fires a single mixpanel event when a viewer lands on a scorecard.
// Renders nothing. Deduped per-mount (StrictMode + remounts wouldn't
// double-fire). Identity properties carry viewerEmail/viewerUserId so
// the events can be grouped by viewer in the Mixpanel UI even without
// calling mixpanel.identify() — the existing scanner mixpanel infra is
// init-only.
export function ScannerViewTracker(props: ScannerViewTrackerProps) {
  const { variant, scanId, slug, grade, totalScore, orgName, viewerIsOwner } = props;
  const { mixpanel } = useMixpanel("scanner");
  const { ready, authenticated, user } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!ready) return;
    if (!scanId && !slug) return;
    firedRef.current = true;
    void mixpanel.reportEvent({
      event: variant === "public" ? "public-scorecard-view" : "scan-detail-view",
      properties: {
        scanId: scanId ?? null,
        slug: slug ?? null,
        grade: grade ?? null,
        totalScore: totalScore ?? null,
        orgName: orgName ?? null,
        viewerIsAuthenticated: authenticated,
        viewerUserId: authenticated ? user?.id ?? null : null,
        viewerEmail: authenticated ? user?.email?.address ?? null : null,
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
    mixpanel,
  ]);

  return null;
}
