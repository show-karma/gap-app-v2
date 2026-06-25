"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LoggedInDetail } from "@/src/features/scanner/components/logged-in-detail";
import { PAGES } from "@/utilities/pages";

export default function ScanDetailPage() {
  // useParams returns proxies; per gap-app-v2/CLAUDE.md, never use these
  // directly in useEffect deps. Destructure to a primitive first.
  const params = useParams<{ id: string }>();
  const scanId = params?.id ?? null;
  const router = useRouter();
  const { authenticated, ready, login, user } = useAuth();
  const email = user?.email?.address ?? undefined;

  // Auth tri-state per CLAUDE.md: render skeleton while not ready, never
  // render the authorized UI or a denial mid-resolution.
  useEffect(() => {
    if (ready && !authenticated && scanId) {
      // Stash return path before kicking the login modal so we land back here.
      // login() handles the redirect once Privy completes.
    }
  }, [ready, authenticated, scanId]);

  const showLogin = ready && !authenticated;

  const userEmail = useMemo(() => email, [email]);

  if (!scanId) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-semibold">Scan not found</h1>
        <Button type="button" onClick={() => router.push(PAGES.SCANNER.ROOT)}>
          Back to scanner
        </Button>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
        <output
          className="flex animate-pulse flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="h-16 w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </output>
      </main>
    );
  }

  if (showLogin) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Log in to see the full report
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The detailed report includes top fixes, per-check evidence, and the donate-flow
          walkthrough notes for this scan.
        </p>
        <Button type="button" onClick={() => login()}>
          Log in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <LoggedInDetail scanId={scanId} userEmail={userEmail} />
    </main>
  );
}
