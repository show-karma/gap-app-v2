"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NavbarAuthButtonsSkeleton } from "./navbar-user-skeleton";

export function NavbarAuthButtons() {
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
