"use client";

/**
 * Client-side dynamic (SSR-disabled) wrapper for FoundationDetail.
 *
 * `ssr: false` is not allowed in Server Components. This thin client wrapper
 * re-exports a lazily loaded version so page.tsx Server Components can import
 * it safely. The component relies on browser APIs (Zustand persist,
 * sessionStorage, motion) that must not run on the server.
 */
import dynamic from "next/dynamic";

export const FoundationDetailDynamic = dynamic(
  () =>
    import("./foundation-detail").then((m) => ({
      default: m.FoundationDetail,
    })),
  { ssr: false }
);
