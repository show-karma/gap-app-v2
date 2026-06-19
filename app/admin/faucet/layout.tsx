"use client";

import { Spinner } from "@/components/Utilities/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { useFaucetAdmin } from "@/hooks/useFaucetAdmin";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { faucetAdminDenial } from "@/src/components/ui/access-denied-presets";
import { PAGES } from "@/utilities/pages";

export default function FaucetAdminLayout({ children }: { children: React.ReactNode }) {
  // Gate on Privy `ready`/`authenticated` — never wagmi `isConnected`, which is
  // briefly false while Privy is already authenticated at startup (the
  // Privy/Wagmi race). The previous useEffect redirect made AccessDenied
  // unreachable; denial is now rendered explicitly as a terminal state.
  const { ready, authenticated } = useAuth();
  const { isAdmin, isLoading } = useFaucetAdmin();

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
        title="Faucet admin access required"
        {...faucetAdminDenial()}
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

  if (!isAdmin) {
    return <AccessDenied title="Faucet admin access required" {...faucetAdminDenial()} />;
  }

  return <>{children}</>;
}
