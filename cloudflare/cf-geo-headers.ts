export const CF_GEO_COUNTRY_HEADER = "x-karma-cf-country";
export const CF_GEO_REGION_HEADER = "x-karma-cf-region";
export const CF_GEO_CITY_HEADER = "x-karma-cf-city";

const CF_GEO_HEADERS = [CF_GEO_COUNTRY_HEADER, CF_GEO_REGION_HEADER, CF_GEO_CITY_HEADER] as const;

export interface CfGeoProperties {
  country?: unknown;
  region?: unknown;
  regionCode?: unknown;
  city?: unknown;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Propagates Cloudflare edge geolocation from the public routing Worker's
 * `request.cf` onto the internal request sent over the `NEXT_SERVER` Service
 * Binding. Any caller-supplied `x-karma-cf-*` headers are always stripped so
 * they cannot be spoofed; `region` and `city` are percent-encoded because
 * Cloudflare can supply non-ASCII names that `Headers.set` would reject.
 */
export function withCfGeoHeaders(
  incoming: Request & { cf?: CfGeoProperties },
  forwarded: Request
): Request {
  const cf = incoming.cf;
  const country = nonEmptyString(cf?.country);
  const region = nonEmptyString(cf?.regionCode) ?? nonEmptyString(cf?.region);
  const city = nonEmptyString(cf?.city);

  const hasIncomingGeoHeaders = CF_GEO_HEADERS.some((name) => forwarded.headers.has(name));
  if (!hasIncomingGeoHeaders && !country && !region && !city) {
    return forwarded;
  }

  const headers = new Headers(forwarded.headers);
  for (const name of CF_GEO_HEADERS) {
    headers.delete(name);
  }
  if (country) headers.set(CF_GEO_COUNTRY_HEADER, country);
  if (region) headers.set(CF_GEO_REGION_HEADER, encodeURIComponent(region));
  if (city) headers.set(CF_GEO_CITY_HEADER, encodeURIComponent(city));

  return new Request(forwarded, { headers });
}
