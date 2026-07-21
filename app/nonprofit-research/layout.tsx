"use client";

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLoadPrivy, usePrivyBridge } from "@/contexts/privy-bridge-context";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { DonorResearchLoading } from "@/src/features/donor-research/components/common/DonorResearchLoading";
import { DonorResearchShell } from "@/src/features/donor-research/components/common/DonorResearchShell";
import { TokenManager } from "@/utilities/auth/token-manager";
import { isDonorResearchTokenRoute, PAGES } from "@/utilities/pages";

const DONOR_RESEARCH_QUERY_ROOT = ["donor-research"] as const;

/**
 * Identity each QueryClient's donor-research cache was last prepared for.
 * Keyed on the client rather than module state so the stamp shares the exact
 * lifetime of the cache it protects (the app-wide client survives section
 * unmounts; a fresh client in tests starts unstamped).
 */
const preparedIdentityByClient = new WeakMap<QueryClient, string>();

/** Clients whose stale JWT cache has already been dropped on first mount. */
const tokenClearedForClient = new WeakSet<QueryClient>();

/**
 * Keeps advisor-owned React Query data isolated across Privy sessions.
 *
 * Donor-research queries intentionally share broad keys so list/detail
 * mutations can invalidate them as a group. That also means a logout/login
 * can reuse the prior advisor's fresh cache unless the whole feature subtree
 * is paused while its cache is cleared. This layout persists across every
 * donor-research route, making it the single boundary that observes an
 * identity change before any page-level query mounts for the next account.
 *
 * The pause only happens when the identity actually changed since the cache
 * was last used. A first visit or a same-account re-entry renders children
 * in the same pass — no "switching" flash before the route skeletons.
 */
interface DonorResearchSessionBoundaryProps {
  children: React.ReactNode;
  requiresAuth: boolean;
}

function DonorResearchSessionBoundary({
  children,
  requiresAuth,
}: DonorResearchSessionBoundaryProps) {
  const queryClient = useQueryClient();
  const { ready, authenticated, user } = usePrivyBridge();
  const loadPrivy = useLoadPrivy();
  const userId = user?.id;
  const sessionIdentity = useMemo(() => {
    if (!ready) return null;
    if (!authenticated) return "anonymous";
    return userId ? `user:${userId}` : null;
  }, [ready, authenticated, userId]);
  const [, setPreparedTick] = useState(0);

  useEffect(() => {
    if (requiresAuth) {
      loadPrivy();
    }
  }, [loadPrivy, requiresAuth]);

  // Drop any short-lived JWT left in the token cache before the first
  // donor-research query can mount (they only render under this boundary).
  // Runs during render, once per client, so it precedes child query effects
  // even while Privy is still initializing. Idempotent under StrictMode.
  if (!tokenClearedForClient.has(queryClient)) {
    TokenManager.clearCache();
    tokenClearedForClient.add(queryClient);
  }

  // Stamp the identity the moment it first resolves so a same-account
  // re-entry is never treated as a switch.
  if (sessionIdentity && !preparedIdentityByClient.has(queryClient)) {
    preparedIdentityByClient.set(queryClient, sessionIdentity);
  }

  const preparedIdentity = preparedIdentityByClient.get(queryClient) ?? null;
  // A switch is only real once we HAD an identity and it changed. While Privy
  // is still initializing (`preparedIdentity` null) this stays false, so the
  // shell renders through with its own sidebar + content skeleton instead of
  // a separate chrome-less loader.
  const cacheIsStale =
    sessionIdentity !== null && preparedIdentity !== null && preparedIdentity !== sessionIdentity;

  useEffect(() => {
    if (!cacheIsStale) return;

    let active = true;
    const prepareSession = async () => {
      // A stable Privy getAccessToken function can survive an account switch,
      // so clear its short-lived JWT cache before any new request is allowed.
      TokenManager.clearCache();
      await queryClient.cancelQueries({ queryKey: DONOR_RESEARCH_QUERY_ROOT });
      queryClient.removeQueries({ queryKey: DONOR_RESEARCH_QUERY_ROOT });
      if (!active) return;
      preparedIdentityByClient.set(queryClient, sessionIdentity as string);
      setPreparedTick((tick) => tick + 1);
    };

    void prepareSession();
    return () => {
      active = false;
    };
  }, [queryClient, sessionIdentity, cacheIsStale]);

  // Only a genuine account switch blocks the subtree — and it fills the pane
  // rather than collapsing to content width. Every other state (first load,
  // Privy still initializing, same account) renders the shell, which owns its
  // own loading skeleton.
  if (cacheIsStale) {
    return (
      <div className="flex min-h-[calc(100vh-var(--navbar-height,64px))] w-full flex-col p-4 sm:p-6 lg:p-8">
        <DonorResearchLoading label="Switching accounts…" />
      </div>
    );
  }

  if (requiresAuth && !ready) {
    return <AccessDenied isLoading />;
  }

  if (requiresAuth && !authenticated) {
    return (
      <AccessDenied
        compactTitle
        title="Sign in to access nonprofit research"
        message="Sign in to create research reports, build donor profiles, and return to your saved work."
      />
    );
  }

  return children;
}

/**
 * Donor-research section layout (U12).
 *
 * Wraps the section in the global `PermissionProvider` (same posture as
 * `/dashboard`) so any nested permission hooks resolve cleanly. The
 * donor-research feature does not use community-scoped RBAC — every
 * route is owner-scoped on the advisor row, so the read services in the
 * indexer enforce tenant isolation rather than the frontend's
 * `useReviewerPrograms` style detection.
 *
 * The navigation shell lives here — not in each page — so the sidebar,
 * header, and breadcrumbs persist across route transitions and only the
 * content pane swaps to the route's `loading.tsx` skeleton.
 *
 * Two flows render full-screen without that shell: onboarding, and the two
 * anonymous token routes (donor share view + diligence response), which carry
 * their own `TokenPageShell`. Wrapping those in the advisor shell would flash
 * the authenticated sidebar/breadcrumb (and its route skeleton) for a beat
 * before the page resolves to its slim chrome — so they bypass it entirely,
 * matching the footer suppression keyed on the same `isDonorResearchTokenRoute`.
 */
export default function DonorResearchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShellless =
    pathname.startsWith(PAGES.DONOR_RESEARCH.ONBOARDING) || isDonorResearchTokenRoute(pathname);

  return (
    <DonorResearchSessionBoundary requiresAuth={!isShellless}>
      <PermissionProvider>
        {isShellless ? children : <DonorResearchShell>{children}</DonorResearchShell>}
      </PermissionProvider>
    </DonorResearchSessionBoundary>
  );
}
