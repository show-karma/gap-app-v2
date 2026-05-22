"use client";

/**
 * Client-side dynamic wrapper for LandingPageClient.
 *
 * `ssr: false` is not allowed in Server Components (Next.js / Turbopack
 * enforces this). This thin client wrapper re-exports a lazily loaded version
 * so the page.tsx Server Component can import it safely.
 */
import dynamic from "next/dynamic";

export const LandingPageDynamic = dynamic(
  () =>
    import("./landing-page-client").then((m) => ({
      default: m.LandingPageClient,
    })),
  { ssr: false }
);
