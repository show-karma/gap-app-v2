/**
 * Where the trusted sandbox shell is served from.
 *
 * NO FALLBACK, EVER. If this is unset the custom-page feature is simply
 * unavailable and the page says so. The temptation is to default to the app's
 * own origin so "it works locally" — that default is precisely the stored-XSS
 * hazard the separate origin exists to prevent, and it would be invisible
 * until the day someone stored a hostile document.
 *
 * Returning `undefined` rather than throwing keeps an unconfigured
 * environment renderable: the rest of the notebook feature is unaffected by
 * this one tier being switched off.
 */
export function notebookSandboxOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN?.trim();
  if (!configured) return undefined;
  // A relative or same-origin value would silently defeat the isolation, so it
  // is treated as misconfiguration rather than quietly accepted.
  return /^https?:\/\/[^/]+$/.test(configured) ? configured : undefined;
}
