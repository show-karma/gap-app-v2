"use client";

/**
 * Client-side dynamic wrapper for LandingPageClient.
 *
 * `ssr: false` is not allowed in Server Components (Next.js / Turbopack
 * enforces this). This thin client wrapper re-exports a lazily loaded version
 * so the page.tsx Server Component can import it safely.
 *
 * The `loading` fallback matters here: with `ssr: false`, nothing renders on
 * the server and the route's `loading.tsx` only covers the initial segment
 * suspense — once hydrated, the client chunk loads with no fallback, leaving a
 * blank flash on first load. The spinner below mirrors that `loading.tsx`.
 */
import dynamic from "next/dynamic";

export const LandingPageDynamic = dynamic(
  () =>
    import("./landing-page-client").then((m) => ({
      default: m.LandingPageClient,
    })),
  {
    ssr: false,
    // Inlined (not a named local component) so this file keeps a single
    // component export — react-refresh's only-export-components rule flags a
    // local component declaration alongside the exported one. `<output>` has
    // an implicit role="status" for screen readers.
    loading: () => (
      <main className="flex w-full min-h-screen items-center justify-center bg-background">
        <output
          className="block h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-label="Loading"
        />
      </main>
    ),
  }
);
