"use client";

/**
 * Client-side dynamic (SSR-disabled) wrapper for ChatViewClient.
 *
 * `ssr: false` is not allowed in Server Components (Next.js / Turbopack
 * enforces this). This thin client wrapper re-exports a lazily loaded version
 * so the page.tsx Server Component can import it safely.
 *
 * The chat workbench relies on browser APIs (SSE fetch, sessionStorage,
 * Zustand persist) that must not run on the server.
 *
 * The `loading` fallback mirrors search/[id]/loading.tsx: with `ssr: false`
 * the client chunk loads after hydration with no fallback, so without this the
 * workbench is blank between navigation and the first streamed result.
 */
import dynamic from "next/dynamic";

export const ChatViewDynamic = dynamic(
  () =>
    import("./chat-view-client").then((m) => ({
      default: m.ChatView,
    })),
  {
    ssr: false,
    // Inlined (not a named local component) so this file keeps a single
    // component export — react-refresh's only-export-components rule flags a
    // local component declaration alongside the exported one. A <div> (not
    // <main>) avoids nested landmarks: the search page already wraps this in
    // its own <main>.
    loading: () => (
      <div className="flex w-full min-h-[60vh] flex-col gap-6 px-4 py-16 max-w-4xl mx-auto">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 flex flex-col gap-4">
          {["s1", "s2", "s3", "s4", "s5"].map((id) => (
            <div
              key={id}
              className="h-24 w-full animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    ),
  }
);
