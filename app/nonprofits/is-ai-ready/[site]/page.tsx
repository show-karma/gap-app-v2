"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ErrorState } from "@/src/features/scanner/components/error-state";
import { ScannerSiteReport } from "@/src/features/scanner/components/scanner-site-report";
import { isDomainParam } from "@/src/features/scanner/utils/site";

// Website-addressable report route (ora.ai model): /nonprofits/is-ai-ready/
// <domain>. The `[site]` dynamic segment coexists with the static `scans/`
// folder — the App Router matches the static segment first, so /scans/<uuid>
// stays a pure permalink and only bare domains land here.
export default function ScannerSitePage() {
  // useParams returns proxies; per gap-app-v2/CLAUDE.md, destructure to a
  // primitive before using the value anywhere reactive.
  const params = useParams<{ site: string }>();
  const site = params?.site ?? null;
  const { user } = useAuth();
  const userEmail = user?.email?.address ?? undefined;

  // The segment must be a plausible website domain. A would-be UUID, a stray
  // token, or anything without a dot is a not-found — don't spin up the by-url
  // resolver for garbage.
  if (!site || !isDomainParam(site)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4">
        <ErrorState
          title="Page not found"
          message="This doesn't look like a nonprofit website. Try a domain like waterkeeper.org."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <ScannerSiteReport domain={site} userEmail={userEmail} />
    </main>
  );
}
