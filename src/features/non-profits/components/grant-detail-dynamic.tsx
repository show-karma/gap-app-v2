"use client";

/**
 * Client-side dynamic (SSR-disabled) wrapper for GrantDetail.
 *
 * `ssr: false` is not allowed in Server Components. This thin client wrapper
 * re-exports a lazily loaded version so page.tsx Server Components can import
 * it safely.
 */
import dynamic from "next/dynamic";

export const GrantDetailDynamic = dynamic(
  () =>
    import("./grant-detail").then((m) => ({
      default: m.GrantDetail,
    })),
  { ssr: false }
);
