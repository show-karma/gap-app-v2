/**
 * Token management utilities for Privy JWT authentication
 * This is a thin wrapper around Privy's token methods
 * Privy handles token storage in cookies or localStorage automatically
 */
export class TokenManager {
  private static privyInstance: any = null;

  /**
   * Set the Privy instance to use for token operations
   * This should be called once when the app initializes
   */
  static setPrivyInstance(privy: any): void {
    TokenManager.privyInstance = privy;
  }

  /**
   * Get token from cookies for server-side requests
   * This should only be called from server components/actions
   */
  static async getServerToken(): Promise<string | null> {
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
  }

  /**
   * Get the current access token from Privy
   * This method now works on both client and server side
   */
  static async getToken(): Promise<string | null> {
    // Server-side: Use getServerToken
    if (typeof window === "undefined") {
      return TokenManager.getServerToken();
    }

    // Client-side: Use Privy instance
    if (TokenManager.privyInstance?.getAccessToken) {
      try {
        const token = await TokenManager.privyInstance.getAccessToken();
        return token;
      } catch (error) {
        console.error("Failed to get Privy access token:", error);
        return null;
      }
    }

    // Fallback: Try to get from cookies if Privy stores there
    // Privy handles this automatically based on your configuration
    return null;
  }

  /**
   * Get authorization header with the current token
   */
  static async getAuthHeader(): Promise<Record<string, string>> {
    const token = await TokenManager.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Check if user is authenticated
   * This should be replaced with Privy's authenticated state
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await TokenManager.getToken();
    return !!token;
  }

  /**
   * Clear authentication tokens (logout)
   * Note: With Privy, you should use the logout() method from usePrivy() hook
   * This is just a utility for edge cases
   */
  static async clearTokens(): Promise<void> {
    if (typeof window === "undefined") {
      // Server-side: can't clear cookies directly
      console.warn("clearTokens should be called client-side using Privy's logout method");
      return;
    }

    // Client-side: Privy handles this through its logout method
    if (TokenManager.privyInstance?.logout) {
      await TokenManager.privyInstance.logout();
    }
  }
}
