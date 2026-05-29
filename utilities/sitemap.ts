// Google's sitemap parser rejects W3C Datetime values with fractional seconds.
// Emit second-precision ISO 8601 instead of the default `.toISOString()`.
export function formatSitemapLastmod(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
