"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { useFaucetAdmin } from "@/hooks/useFaucetAdmin";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { faucetAdminDenial } from "@/src/components/ui/access-denied-presets";
import { PAGES } from "@/utilities/pages";

export default function FaucetAdminLayout({ children }: { children: React.ReactNode }) {
  const { push } = useRouter();
  const { isConnected, ready } = useAuth();
  const { isAdmin, isLoading } = useFaucetAdmin();
  useEffect(() => {
    if (!ready) return;

    if (!isConnected) {
      push(PAGES.HOME);
      return;
    }

    if (!isLoading && !isAdmin) {
      push(PAGES.HOME);
    }
  }, [ready, isConnected, isAdmin, isLoading, push]);

  if (!ready || isLoading) {
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
