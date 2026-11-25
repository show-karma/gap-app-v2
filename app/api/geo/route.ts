import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isVercelPlatform } from "@/utilities/deployment-env";

// Forwarded from cloudflare/front-handler.ts (via cloudflare/cf-geo-headers.ts)
// because OpenNext's Service Binding fetch drops request.cf across Workers.
const CF_GEO_COUNTRY_HEADER = "x-karma-cf-country";
const CF_GEO_REGION_HEADER = "x-karma-cf-region";
const CF_GEO_CITY_HEADER = "x-karma-cf-city";

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

interface CloudflareGeoContext {
  cf?: {
    country?: unknown;
    region?: unknown;
    regionCode?: unknown;
    city?: unknown;
  };
}

function readCloudflareCf(): CloudflareGeoContext["cf"] {
  const context = (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL] as
    | CloudflareGeoContext
    | undefined;
  return context?.cf;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeCountry(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  // Reject Cloudflare unknown ("XX") and Tor ("T1") sentinel codes.
  if (!/^[A-Z]{2}$/.test(upper) || upper === "XX") return null;
  return upper;
}

function decodeHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function GET() {
  try {
    const headersList = await headers();

    if (isVercelPlatform()) {
      const country = normalizeCountry(headersList.get("x-vercel-ip-country")) ?? "US";
      const region = decodeHeaderValue(headersList.get("x-vercel-ip-country-region"));
      const city = decodeHeaderValue(headersList.get("x-vercel-ip-city"));
      return NextResponse.json({ country, region, city });
    }

    const cf = readCloudflareCf();
    const country =
      normalizeCountry(cf?.country) ??
      normalizeCountry(headersList.get(CF_GEO_COUNTRY_HEADER)) ??
      normalizeCountry(headersList.get("cf-ipcountry")) ??
      normalizeCountry(headersList.get("x-vercel-ip-country")) ??
      "US";
    const region =
      nonEmptyString(cf?.regionCode) ??
      nonEmptyString(cf?.region) ??
      decodeHeaderValue(headersList.get(CF_GEO_REGION_HEADER)) ??
      decodeHeaderValue(headersList.get("x-vercel-ip-country-region"));
    const city =
      nonEmptyString(cf?.city) ??
      decodeHeaderValue(headersList.get(CF_GEO_CITY_HEADER)) ??
      decodeHeaderValue(headersList.get("x-vercel-ip-city"));

    return NextResponse.json({ country, region, city });
  } catch {
    // Fallback to US if headers cannot be read
    return NextResponse.json({
      country: "US",
      region: null,
      city: null,
    });
  }
}
