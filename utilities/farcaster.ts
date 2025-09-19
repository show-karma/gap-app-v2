/**
 * Formats a Farcaster link to ensure it has the proper protocol and domain
 * @param farcasterInput - The Farcaster link or username
 * @returns Formatted Farcaster URL
 */
export function formatFarcasterLink(farcasterInput: string): string {
  if (!farcasterInput) return "";

  // If it already includes http/https, return as is
  if (farcasterInput.includes("http")) {
    return farcasterInput;
  }

  // If it includes warpcast.com or farcaster.xyz, just prepend https://
  if (
    farcasterInput.includes("warpcast.com") ||
    farcasterInput.includes("farcaster.xyz")
  ) {
    return `https://${farcasterInput}`;
  }

  // Default to warpcast.com for usernames
  return `https://warpcast.com/${farcasterInput}`;
}