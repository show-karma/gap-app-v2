// Preload static assets as base64 to avoid external requests
export const STATIC_ASSETS = {
  backgroundImage: "https://gap.karmahq.xyz/assets/previews/background.png",
  karmaLogo: "https://gap.karmahq.xyz/assets/previews/karma-gap-logo-glow.png",
  fundingIcon: "https://gap.karmahq.xyz/icons/funding-lg.png",
  impactIcon: "https://gap.karmahq.xyz/icons/impact.png",
  endorsementsIcon: "https://gap.karmahq.xyz/icons/endorsements-lg.png",
  projectsIcon: "https://gap.karmahq.xyz/icons/projects.png",
} as const;

// Cache control headers for optimal CDN caching
export const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=3600, max-age=3600",
  "Vercel-CDN-Cache-Control": "public, s-maxage=3600, max-age=3600",
} as const;

// Helper to create optimized image response with proper headers
export function createOptimizedImageResponse(
  imageResponse: Response,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(imageResponse.body, {
    headers: {
      ...Object.fromEntries(imageResponse.headers.entries()),
      ...CACHE_HEADERS,
      ...additionalHeaders,
    },
  });
}

// Helper to safely extract data with defaults
export function safeExtract<T>(
  data: T | null | undefined,
  defaultValue: T
): T {
  return data ?? defaultValue;
}

// Optimize text truncation
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}