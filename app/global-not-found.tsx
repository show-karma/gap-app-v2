import localFont from "next/font/local";
import Link from "next/link";
import "@/styles/globals.css";

/**
 * The 404 for everything the router cannot match.
 *
 * The page tree lives under `app/t/[tenant]/`, so there is no root-level
 * `app/not-found.tsx` any more, and `app/t/[tenant]/not-found.tsx` only covers
 * `notFound()` thrown *below* that layout. Without this file three cases fell
 * through to Next's own unbranded "404: This page could not be found.":
 *
 *   - any unmatched public URL (`/does-not-exist-xyz`)
 *   - the unknown-tenant guard, which throws from the root layout itself
 *   - a public request carrying the internal `/t/` prefix, which the proxy
 *     rewrites to an unmatchable path
 *
 * `global-not-found` renders *instead of* the root layout, not inside it, so it
 * owns its own `<html>`/`<body>` and font wiring. It deliberately does not pull
 * in the navbar, footer or providers: they all depend on tenant context this
 * route has no access to, and in-app 404s (`/blog/<missing>`) already render
 * without chrome, so this matches them.
 *
 * Requires `experimental.globalNotFound: true` — the flag still exists in
 * 16.3.3 and defaults to false.
 */

// Re-declared rather than imported from the root layout: importing it would
// pull the whole provider tree into a route that must not depend on it.
// `next/font` dedupes by src, so this is the same file, not a second download.
const inter = localFont({
  src: "../public/fonts/Inter/Inter.woff2",
  variable: "--font-inter",
  display: "swap",
});

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      {/* Rendered inline rather than exported as `metadata`: a non-component
          export next to a component trips react-doctor's only-export-components
          rule, and React hoists these into <head> anyway. The 404 status is what
          actually keeps this out of an index; the tag is belt and braces. */}
      <title>404 - Page Not Found</title>
      <meta name="robots" content="noindex, follow" />
      <body suppressHydrationWarning>
        <div className="col-span-12 min-h-screen p-4">
          <h1 className="text-3xl mb-5">404 - Page Not Found</h1>
          <Link href="/">Go Home</Link>
        </div>
      </body>
    </html>
  );
}
