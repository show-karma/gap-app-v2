/**
 * Token management utilities for Privy JWT authentication
 * This is a thin wrapper around Privy's token methods
 * Privy handles token storage in cookies or localStorage automatically
 */
interface PrivyTokenProvider {
  getAccessToken?: () => Promise<string | null>;
}

/**
 * Cache TTL for access tokens (in ms).
 * With a 10s polling interval and 3-failure threshold, worst case stale
 * data is ~50s (20s cache + 3×10s checks). Deduplicates burst API calls
 * while keeping auth state reasonably fresh.
 */
const TOKEN_CACHE_TTL_MS = 20_000;

let privyInstance: PrivyTokenProvider | null = null;
let cachedToken: string | null = null;
let cacheExpiry = 0;
let pendingRequest: Promise<string | null> | null = null;
let instanceReadyResolvers: Array<() => void> = [];

// Resolves once a Privy instance with getAccessToken has been registered,
// or after `timeoutMs` if Privy never finishes bootstrapping (e.g. the SDK
// failed to load). Lets API calls fired on cold page load wait for auth
// bootstrap instead of racing it and 401'ing.
function waitForInstance(timeoutMs = 3000): Promise<void> {
  if (privyInstance?.getAccessToken) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    instanceReadyResolvers.push(done);
    setTimeout(done, timeoutMs);
  });
}

export const TokenManager = {
  /**
   * Set the Privy instance to use for token operations
   * This should be called once when the app initializes
   */
  setPrivyInstance(privy: PrivyTokenProvider | null): void {
    if (privy !== privyInstance) {
      TokenManager.clearCache();
    }
    privyInstance = privy;
    if (privy?.getAccessToken) {
      const resolvers = instanceReadyResolvers;
      instanceReadyResolvers = [];
      for (const resolve of resolvers) {
        resolve();
      }
    }
  },

  /**
   * Clear the token cache. Call this on logout or user switch
   * to force fresh token retrieval on next request.
   */
  clearCache(): void {
    cachedToken = null;
    cacheExpiry = 0;
    pendingRequest = null;
  },

  /**
   * Get token from cookies for server-side requests
   * This should only be called from server components/actions
   */
  async getServerToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      console.warn("getServerToken should only be called server-side");
      return null;
    }

    try {
      // Dynamically import cookies to avoid build issues
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();

      // Check common Privy token cookie names
      const tokenNames = ["privy-token", "privy-access-token", "privy-id-token", "privy-jwt"];

      for (const name of tokenNames) {
        const token = cookieStore.get(name)?.value;
        if (token) {
          return token;
        }
      }

      // Also check for any cookie that contains 'privy' and 'token'
      const allCookies = cookieStore.getAll();
      for (const cookie of allCookies) {
        const lowerName = cookie.name.toLowerCase();
        if (
          lowerName.includes("privy") &&
          (lowerName.includes("token") || lowerName.includes("jwt"))
        ) {
          return cookie.value;
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to get JWT from cookies:", error);
      return null;
    }
  },

  /**
   * Get the current access token from Privy
   * This method now works on both client and server side.
   *
   * Client-side: Uses a 30s TTL cache + request deduplication to prevent
   * excessive getAccessToken() calls from polling intervals + API interceptors.
   */
  async getToken(): Promise<string | null> {
    // Server-side: Use getServerToken (no caching needed)
    if (typeof window === "undefined") {
      return TokenManager.getServerToken();
    }

    // Cypress E2E auth bypass: return mock token from localStorage
    if (
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true" &&
      (window as Window & { Cypress?: unknown }).Cypress
    ) {
      return localStorage.getItem("privy:token");
    }

    // Return cached token if still valid
    if (cachedToken && Date.now() < cacheExpiry) {
      return cachedToken;
    }

    // Deduplicate concurrent requests — if a request is already in-flight,
    // return the same promise instead of making parallel getAccessToken() calls
    if (pendingRequest) {
      return pendingRequest;
    }

    // Client-side: wait briefly for Privy bootstrap if it hasn't run yet.
    // Fixes 401 race when a page mounts an authenticated query before any
    // component has called useAuth() to register the Privy instance.
    if (!privyInstance?.getAccessToken) {
      await waitForInstance();
    }

    // Client-side: Use Privy instance
    if (privyInstance?.getAccessToken) {
      pendingRequest = (async () => {
        try {
          const token = await privyInstance!.getAccessToken!();
          cachedToken = token;
          cacheExpiry = Date.now() + TOKEN_CACHE_TTL_MS;
          return token;
        } catch (error) {
          console.error("Failed to get Privy access token:", error);
          return null;
        } finally {
          pendingRequest = null;
        }
      })();
      return pendingRequest;
    }

    // Fallback: Try to get from cookies if Privy stores there
    // Privy handles this automatically based on your configuration
    return null;
  },

  /**
   * Get authorization header with the current token
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await TokenManager.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Check if user is authenticated
   * This should be replaced with Privy's authenticated state
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await TokenManager.getToken();
    return !!token;
  },
};
