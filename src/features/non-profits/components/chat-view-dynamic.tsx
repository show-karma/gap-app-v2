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
 */
import dynamic from "next/dynamic";

export const ChatViewDynamic = dynamic(
  () =>
    import("./chat-view-client").then((m) => ({
      default: m.ChatView,
    })),
  { ssr: false }
);
