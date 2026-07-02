"use client";

import { FileText, Lock, MousePointerClick, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { LoggedInDetail } from "@/src/features/scanner/components/logged-in-detail";
import { PAGES } from "@/utilities/pages";

export default function ScanDetailPage() {
  // useParams returns proxies; per gap-app-v2/CLAUDE.md, destructure to a
  // primitive before using the value in any effect dependency.
  const params = useParams<{ id: string }>();
  const scanId = params?.id ?? null;
  const router = useRouter();
  const { authenticated, ready, login, user } = useAuth();
  const userEmail = user?.email?.address ?? undefined;

  const showLogin = ready && !authenticated;

  // Stash this report's URL before kicking the Privy modal so the user
  // lands back here once login completes, instead of on the app default.
  function handleLogin() {
    if (scanId) {
      setPostLoginRedirect(PAGES.SCANNER.SCAN_DETAIL(scanId));
    }
    login();
  }

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
          className="flex animate-pulse flex-col gap-4 rounded-3xl border border-border bg-card p-6"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="h-16 w-1/2 rounded-2xl bg-secondary" />
          <div className="h-2 w-full rounded-full bg-secondary" />
        </output>
      </main>
    );
  }

  if (showLogin) {
    return (
      <main className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-emphasis">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-foreground">
            Sign in to see the full report
          </h1>
          <p className="mb-5 text-[14.5px] leading-relaxed text-muted-foreground">
            Your grade is public. The prioritized fixes, per-check evidence, and donate-flow
            walkthrough are members-only.
          </p>
          <Button type="button" size="lg" className="w-full" onClick={handleLogin}>
            Log in to unlock
          </Button>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">what you'll unlock</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <ul className="flex flex-col gap-2.5">
            {[
              { icon: Wrench, label: "Prioritized fixes, ranked by impact" },
              { icon: FileText, label: "Per-check evidence for all 25 checks" },
              { icon: MousePointerClick, label: "Donate-flow walkthrough" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 text-sm text-foreground-alt"
                >
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-secondary text-brand-emphasis">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <LoggedInDetail scanId={scanId} userEmail={userEmail} />
    </main>
  );
}
