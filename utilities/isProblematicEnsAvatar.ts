/**
 * List of problematic ENS avatar domains that should be blocked.
 * These domains are known to cause issues such as:
 * - 503 Service Unavailable errors
 * - Slow response times that degrade UX
 * - Unreliable uptime affecting avatar loading
 *
 * Add domains to this list as they are identified as problematic.
 * Format: domain strings that will be matched against the URL hostname.
 */
const PROBLEMATIC_ENS_AVATAR_DOMAINS = [
  // euc.li - ENS avatar service that frequently returns 503 errors
  // and causes cascading failures in avatar loading
  "euc.li",
] as const;

/**
 * Checks if an ENS avatar URL is from a known problematic external service.
 * These services may cause 503 errors or other reliability issues that
 * degrade user experience and can cascade into application errors.
 *
 * @param url - The avatar URL to validate
 * @returns true if the URL is from a problematic domain, false otherwise
 */
export function isProblematicEnsAvatar(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    const isProblematic = PROBLEMATIC_ENS_AVATAR_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isProblematic && process.env.NODE_ENV === "development") {
      console.warn(
        `[EthereumAddressToENSAvatar] Blocked problematic ENS avatar URL: ${url}. ` +
          `Domain "${hostname}" is known to cause 503 errors. Falling back to blockie avatar.`
      );
    }

    return isProblematic;
  } catch {
    // Invalid URL - treat as problematic to be safe
    return true;
  }
}
