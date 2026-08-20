"use client";

import { useEffect } from "react";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { useAuth } from "@/hooks/useAuth";
import { useTenantSafe } from "@/store/tenant";
import { clearIdentityHint, writeIdentityHint } from "@/utilities/auth/identity-hint";

/**
 * Keeps the identity hint cookie in step with the session.
 *
 * Mounted from the whitelabel navbar, which is the surface that only renders on
 * a tenant's own host — the same condition under which the hint means anything.
 *
 * What it publishes is whatever the navbar's own account button is showing,
 * taken from the hook they share. It does not decide anything about identity
 * itself: this once had a second copy of that chain, and the two answered
 * differently for the same person — the button a name, the hint a raw address.
 *
 * Waits for `ready` before doing either thing. Privy reports
 * `authenticated: false` while it is still rehydrating, and acting on that
 * would clear the hint on every cold load of a signed-in visitor, which is the
 * flicker this exists to remove.
 */
export function useIdentityHint(): void {
  const { ready, authenticated } = useAuth();
  const { name, avatar, address } = useAccountIdentity();
  const tenant = useTenantSafe();
  const domain = tenant?.identityHintCookieDomain;

  useEffect(() => {
    if (!domain || !ready) return;

    if (!authenticated) {
      clearIdentityHint(domain);
      return;
    }

    // Nothing resolved yet — leave whatever is there rather than clearing it,
    // or a signed-in visitor's name would blink out mid-load.
    if (!name) return;

    writeIdentityHint(
      avatar
        ? { v: 1, name, avatar }
        : // No picture: carry the address so the reader can draw the same
          // identicon the button falls back to. Only one of the two is sent.
          address
          ? { v: 1, name, address }
          : { v: 1, name },
      domain
    );
  }, [domain, ready, authenticated, name, avatar, address]);
}
