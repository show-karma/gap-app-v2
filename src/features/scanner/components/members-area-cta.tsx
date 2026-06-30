"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { PAGES } from "@/utilities/pages";
import { getPublicScorecardBySlug } from "../services/scanner.service";

interface MembersAreaCtaProps {
  readonly slug: string;
  // Server-rendered scanId if the SSR scorecard fetch succeeded. When
  // null, the client recovers the scanId before routing — never falls
  // back to the slug, which would corrupt the detail-page URL.
  readonly scanId: string | null;
}

export function MembersAreaCta({ slug, scanId: initialScanId }: MembersAreaCtaProps) {
  const { push } = useRouter();
  const { ready, authenticated, login } = useAuth();
  const [scanId, setScanId] = useState<string | null>(initialScanId);

  useEffect(() => {
    // Re-sync local state on every slug/SSR change. Without this the CTA
    // keeps the previous scan's id when the component is reused across
    // /s/[slug] transitions under a shared layout, routing to the wrong
    // detail page.
    if (initialScanId) {
      setScanId(initialScanId);
      return;
    }
    setScanId(null);
    let cancelled = false;
    getPublicScorecardBySlug(slug)
      .then((s) => {
        if (!cancelled) setScanId(s.scanId);
      })
      .catch(() => {
        // SUPPRESSED: scorecard may legitimately be missing (unpublished,
        // 404). UI degrades to disabled button below.
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialScanId]);

  function handleLogin() {
    if (!scanId) return;
    const detailHref = PAGES.SCANNER.SCAN_DETAIL(scanId);
    if (authenticated) {
      push(detailHref);
      return;
    }
    // Persist the return target across the Privy modal handoff so the
    // user lands on the detailed report once login completes.
    setPostLoginRedirect(detailHref);
    login();
  }

  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <button
        type="button"
        onClick={handleLogin}
        disabled={!ready || !scanId}
        className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {authenticated ? "Open full report" : "Log in to see the report"}
        <span aria-hidden>→</span>
      </button>
      <Link
        href={PAGES.SCANNER.ROOT}
        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Scan another site
      </Link>
    </div>
  );
}
