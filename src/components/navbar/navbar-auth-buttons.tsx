"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NavbarAuthButtonsSkeleton } from "./navbar-user-skeleton";

function NavbarAuthButtonsInner() {
  const { authenticate: login, ready, authenticated } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!ready || authenticated || hasTriggeredRef.current) return;
    if (searchParams?.get("login") !== "true") return;
    hasTriggeredRef.current = true;
    login();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("login");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [ready, authenticated, searchParams, login, pathname, router]);

  if (!ready) {
    return <NavbarAuthButtonsSkeleton />;
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={login}>
        Sign in
      </Button>
    </div>
  );
}

/**
 * The `useSearchParams()` above opts this component out of static rendering
 * unless a Suspense boundary sits over it, and the navbar is mounted by the
 * root layout on every route — so without this the whole app is forced
 * dynamic. The boundary costs nothing here: Privy's `ready` is always false on
 * the server, so the server already renders exactly this fallback. The server
 * HTML is unchanged, which keeps the no-JS output identical (DEV-612).
 */
export function NavbarAuthButtons() {
  return (
    <Suspense fallback={<NavbarAuthButtonsSkeleton />}>
      <NavbarAuthButtonsInner />
    </Suspense>
  );
}
