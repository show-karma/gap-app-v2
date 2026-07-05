import { NextResponse } from "next/server";

const UPSTREAM_TIMEOUT_MS = 10_000;

// Hosts that must never be fetched server-side: loopback, link-local
// (cloud metadata), and RFC-1918 private ranges. The proxy exists to work
// around CORS on public image CDNs, so anything non-public is an SSRF probe.
const isBlockedHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  // IPv6 loopback / unspecified / link-local / unique-local
  if (host === "[::1]" || host === "::1" || host.startsWith("fe80:") || host.startsWith("fd")) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
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
