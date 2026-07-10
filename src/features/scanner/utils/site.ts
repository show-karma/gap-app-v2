// Small helpers for presenting the scanned site when the backend didn't return
// a captured org name — shared by the public scorecard and the detail report.

import { PAGES } from "@/utilities/pages";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isScanIdParam(value: string): boolean {
  return UUID_RE.test(value);
}

export function isDomainParam(value: string): boolean {
  return !isScanIdParam(value) && value.includes(".");
}

export function domainToScanUrl(domain: string): string | null {
  const withProtocol = domain.includes("://") ? domain : `https://${domain}`;
  const host = hostnameOf(withProtocol);
  return host ? `https://${host}` : null;
}

// Absolute, website-keyed share URL for a scanned report (ora.ai model):
// `origin` + `/nonprofits/is-ai-ready/<host>`. Keeps the public scorecard and the
// detail report's Share buttons in lockstep as the route format evolves. Falls
// back to the current page URL when the report URL is missing/unparseable, and
// returns "" when called outside the browser (callers guard on `window`).
export function buildScanShareUrl(url?: string | null): string {
  if (typeof window === "undefined") return "";
  const host = hostnameOf(url);
  return host ? `${window.location.origin}${PAGES.SCANNER.SITE(host)}` : window.location.href;
}
