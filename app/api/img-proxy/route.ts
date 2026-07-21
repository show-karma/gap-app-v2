import { NextResponse } from "next/server";

const UPSTREAM_TIMEOUT_MS = 10_000;

// Hosts that must never be fetched server-side: loopback, link-local
// (cloud metadata), and RFC-1918 private ranges. The proxy exists to work
// around CORS on public image CDNs, so anything non-public is an SSRF probe.
//
// NOTE: This is string-based validation of the URL hostname only. It does NOT
// protect against DNS rebinding — a public hostname whose A/AAAA record resolves
// to an internal IP will still pass this guard and be fetched. Closing that gap
// requires resolving the host and validating the *resolved* IP (and pinning it
// through the fetch) — tracked as a follow-up, out of scope for this PR.
const isBlockedIPv4 = (a: number, b: number): boolean => {
  if (a === 127 || a === 10 || a === 0) return true; // loopback, private, "this" network
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC-1918
  if (a === 192 && b === 168) return true; // RFC-1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (100.64.0.0/10)
  return false;
};

const isBlockedHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }

  // WHATWG `new URL()` returns IPv6 hosts wrapped in brackets, e.g. "[fe80::1]".
  // Strip them before any IPv6 comparison so the checks below actually match.
  const h6 = host.replace(/^\[|\]$/g, "");

  // IPv6 loopback / unspecified
  if (h6 === "::1" || h6 === "::") {
    return true;
  }
  // IPv6 link-local fe80::/10 (fe80: .. febf:)
  if (/^fe[89ab][0-9a-f]:/.test(h6)) {
    return true;
  }
  // IPv6 unique-local fc00::/7 (fc.. / fd..)
  if (h6.startsWith("fc") || h6.startsWith("fd")) {
    return true;
  }
  // IPv4-mapped IPv6, dotted form: ::ffff:127.0.0.1
  const mappedDotted = h6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) {
    const parts = mappedDotted[1].split(".").map(Number);
    if (isBlockedIPv4(parts[0], parts[1])) return true;
  }
  // IPv4-mapped IPv6, hex form: ::ffff:7f00:1 (= 127.0.0.1)
  const mappedHex = h6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    // Only the high 16-bit group (a.b) is needed to classify the range.
    const hi = parseInt(mappedHex[1], 16);
    const a = (hi >> 8) & 0xff;
    const b = hi & 0xff;
    if (isBlockedIPv4(a, b)) return true;
  }

  // IPv4 (WHATWG also normalizes integer/hex/octal forms to dotted-quad here,
  // e.g. http://2130706433 -> "127.0.0.1").
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    if (isBlockedIPv4(Number(ipv4[1]), Number(ipv4[2]))) return true;
  }
  return false;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    isBlockedHost(parsed.hostname)
  ) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }

    // Re-validate after redirects: a public URL may 302 to an internal host.
    const finalUrl = new URL(response.url);
    if (
      (finalUrl.protocol !== "http:" && finalUrl.protocol !== "https:") ||
      isBlockedHost(finalUrl.hostname)
    ) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "URL is not an image" }, { status: 400 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": imageBuffer.byteLength.toString(),
      },
    });
  } catch (_error: unknown) {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
  }
}
