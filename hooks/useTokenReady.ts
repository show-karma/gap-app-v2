import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TokenManager } from "@/utilities/auth/token-manager";

const POLL_INTERVAL_MS = 500;
// After this long we stop waiting for a token and enable anyway, so a slow or
// tokenless auth path never leaves data queries permanently disabled.
const POLL_TIMEOUT_MS = 15_000;

/**
 * Returns `true` once the auth JWT is actually available (or, as a safety net,
 * once we've waited long enough that we should proceed regardless).
 *
 * Privy flips `authenticated` true BEFORE the JWT is minted and flickers for
 * ~10-15s during the wagmi sync, so gating data queries on `authenticated`
 * makes every flicker re-enable and refetch — a request storm on page load.
 * Gate on this instead: it polls `TokenManager.getToken()` (the same source
 * `fetchData` uses) until a token exists, then stays `true` until logout. Mirrors
 * the find-funders sign-in recovery pattern.
 */
export function useTokenReady(): boolean {
  const { authenticated, ready } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    // Settled logout — drop back to not-ready so queries disable.
    if (ready && !authenticated) {
      setTokenReady(false);
      return;
    }
    if (!authenticated || tokenReady) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = () => {
      void TokenManager.getToken()
        .catch(() => null)
        .then((token) => {
          if (cancelled) return;
          // Proceed on a real token, or once the wait window elapses (fallback).
          if (token || Date.now() >= deadline) {
            setTokenReady(true);
          } else {
            timer = setTimeout(poll, POLL_INTERVAL_MS);
          }
        });
    };
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authenticated, ready, tokenReady]);

  return tokenReady;
}
