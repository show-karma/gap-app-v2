"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { PAGES } from "@/utilities/pages";

interface MembersAreaCtaProps {
  readonly scanId: string;
}

export function MembersAreaCta({ scanId }: MembersAreaCtaProps) {
  const router = useRouter();
  const { ready, authenticated, login } = useAuth();
  const detailHref = PAGES.SCANNER.SCAN_DETAIL(scanId);

  function handleLogin() {
    if (authenticated) {
      router.push(detailHref);
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
        disabled={!ready}
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
