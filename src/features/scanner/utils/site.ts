// Small helpers for presenting the scanned site when the backend didn't return
// a captured org name — shared by the public scorecard and the detail report.

export function hostnameOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// A display title derived from the domain root (watsi.org → Watsi) as a fallback
// when `orgName` is null.
export function titleFromUrl(url?: string | null): string {
  const host = hostnameOf(url);
  if (!host) return "Scorecard";
  const root = host.split(".")[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}
