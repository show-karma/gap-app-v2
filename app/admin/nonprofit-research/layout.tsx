"use client";

import { Spinner } from "@/components/Utilities/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { staffDenial } from "@/src/components/ui/access-denied-presets";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { PAGES } from "@/utilities/pages";

// Staff-only gate for the nonprofit-research admin overview (DEV-467).
// Gate on Privy `ready`/`authenticated` (never wagmi `isConnected` — the
// Privy/Wagmi startup race). Denial is a terminal render, not a useEffect
// redirect, and staff status is only trusted once resolved (`!isLoading`).
export default function AdminNonprofitResearchLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useAuth();
  const { isStaff, isLoading } = useStaff();

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AccessDenied
        title="Staff access required"
        {...staffDenial()}
        cta={{ label: "Go to Home", href: PAGES.HOME }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isStaff) {
    return <AccessDenied title="Staff access required" {...staffDenial()} />;
  }

  return <>{children}</>;
}
