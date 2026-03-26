"use client";

import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SOCIALS } from "@/utilities/socials";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { NavbarAuthButtonsSkeleton } from "./navbar-user-skeleton";

export function NavbarAuthButtons() {
  const { authenticate: login, ready } = useAuth();
  const { isWhitelabel } = useWhitelabel();

  if (!ready) {
    return <NavbarAuthButtonsSkeleton />;
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={login}>
        Sign in
      </Button>
      {!isWhitelabel && (
        <Button
          variant="outline"
          size="sm"
          className="border-border text-foreground hover:bg-accent shadow-sm"
          asChild
        >
          <ExternalLink href={SOCIALS.PARTNER_FORM}>Contact sales</ExternalLink>
        </Button>
      )}
    </div>
  );
}
