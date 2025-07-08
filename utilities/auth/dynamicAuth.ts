import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

/**
 * Dynamic JWT authentication utilities
 * Handles JWT retrieval with fallback from cookies to localStorage
 */

const DYNAMIC_JWT_KEY = "dynamic_authentication_token";

// Server-side functions have been moved to dynamicAuth.server.ts

/**
 * Get Dynamic JWT token with fallback logic (client-side)
 * Priority: 1. Cookies, 2. localStorage, 3. Dynamic SDK
 * @returns JWT token or null
 */
export async function getDynamicJwtClient(): Promise<string | null> {
  try {
    // 1. Try to get from cookies first
    const cookieValue = getCookie(DYNAMIC_JWT_KEY);
    if (cookieValue) {
      return cookieValue as string;
    }

    // 2. Try localStorage (fallback for client-side)
    const storageToken = localStorage.getItem(DYNAMIC_JWT_KEY);
    if (storageToken) {
      // Also set it in cookies for next time
      setDynamicJwtClient(storageToken);
      return storageToken;
    }

    // 3. Try to get from Dynamic SDK
    try {
      const dynamicToken = getAuthToken();
      if (dynamicToken) {
        // Store in both cookie and localStorage
        setDynamicJwtClient(dynamicToken);
        return dynamicToken;
      }
    } catch (sdkError) {
      console.error("Failed to get token from Dynamic SDK:", sdkError);
    }

    return null;
  } catch (error) {
    console.error("Error retrieving Dynamic JWT:", error);
    return null;
  }
}

/**
 * Get Dynamic JWT token (works on both client and server)
 * Uses cookies-next which handles both environments
 * @returns JWT token or null
 */
export async function getDynamicJwt(): Promise<string | null> {
  // cookies-next automatically handles server/client differences
  const cookieValue = getCookie(DYNAMIC_JWT_KEY);
  if (cookieValue) {
    return cookieValue as string;
  }
  
  // On client-side, also check localStorage and Dynamic SDK
  if (typeof window !== "undefined") {
    return getDynamicJwtClient();
  }
  
  return null;
}

/**
 * Set Dynamic JWT token (client-side only)
 * @param token JWT token to store
 */
export function setDynamicJwtClient(token: string): void {
  try {
    // Set cookie using cookies-next (works on both client and server)
    setCookie(DYNAMIC_JWT_KEY, token, {
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Also set in localStorage for client-side access
    if (typeof window !== "undefined") {
      localStorage.setItem(DYNAMIC_JWT_KEY, token);
    }
  } catch (error) {
    console.error("Error storing Dynamic JWT:", error);
  }
}

/**
 * Clear Dynamic JWT from all storage locations (client-side only)
 */
export function clearDynamicJwt(): void {
  try {
    // Clear cookie using cookies-next
    deleteCookie(DYNAMIC_JWT_KEY, {
      path: "/",
    });

    // Clear localStorage on client-side
    if (typeof window !== "undefined") {
      localStorage.removeItem(DYNAMIC_JWT_KEY);
    }
  } catch (error) {
    console.error("Error clearing Dynamic JWT:", error);
  }
}

/**
 * Get authorization header with Dynamic JWT
 * @returns Authorization header object or empty object
 */
export async function getDynamicAuthHeader(): Promise<{
  authorization?: string;
}> {
  const token = await getDynamicJwt();

  if (token) {
    return {
      authorization: `Bearer ${token}`,
    };
  }

  return {};
}

/**
 * Refresh Dynamic JWT token (client-side only)
 * Attempts to get a fresh token from Dynamic SDK
 */
export async function refreshDynamicJwt(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Clear existing tokens
    clearDynamicJwt();

    // Get fresh token from Dynamic SDK
    const freshToken = getAuthToken();
    if (freshToken) {
      setDynamicJwtClient(freshToken);
      return freshToken;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing Dynamic JWT:", error);
    return null;
  }
}

/**
 * Check if user has a valid Dynamic JWT
 * @returns Boolean indicating if user is authenticated
 */
export async function isDynamicAuthenticated(): Promise<boolean> {
  const token = await getDynamicJwt();

  if (!token) {
    return false;
  }

  try {
    // Basic JWT validation (check if it's expired)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      // Token is expired, clear it
      clearDynamicJwt();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating Dynamic JWT:", error);
    return false;
  }
}

/**
 * Extract user information from Dynamic JWT
 * @returns User information or null
 */
export async function getDynamicUserInfo(): Promise<{
  address?: string;
  email?: string;
  userId?: string;
} | null> {
  const token = await getDynamicJwt();

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Extract primary wallet address
    const primaryWallet = payload.verified_credentials?.[0];
    const address = primaryWallet?.address?.toLowerCase();

    return {
      address,
      email: payload.email || payload.verified_account?.email,
      userId: payload.sub,
    };
  } catch (error) {
    console.error("Error extracting user info from Dynamic JWT:", error);
    return null;
  }
}
