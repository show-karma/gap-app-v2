"use client";

import dynamic from "next/dynamic";
import config from "@/sanity.config";

// Sanity Studio embed. Auth is Sanity's own project-member login (built
// into the Studio) — there is no app-level RBAC gate here. When
// `NEXT_PUBLIC_SANITY_PROJECT_ID` is unset (local dev/CI without Sanity
// configured), the Studio itself renders its own "connect a project"
// prompt rather than the route crashing.
//
// Lazy-loaded via `next/dynamic` (`ssr: false`), same pattern as
// `src/components/blog/TweetEmbed.tsx`: `sanity`'s Studio bundle is a huge
// pre-bundled package (`sanity/lib/index.js`), so this avoids pulling it
// into the SSR render path and drops the app-ssr chunk for this route.
//
// NOTE: this does NOT avoid the known `next build --turbopack` production
// panic on this package (chunk-encoding overflow on very large merged
// chunk items — https://github.com/vercel/next.js/issues/84294, fixed
// upstream in Next 16 but not our pinned 15.5.x). Confirmed by testing:
// Turbopack still traces/chunks the dynamically-imported module for both
// the app-client and app-ssr environments even with `ssr: false`, so the
// panic reproduces identically either way. The only production-build
// workaround (falling back to webpack) was tried and reverted — it
// resurfaces an unrelated, pre-existing incompatibility where Next
// 15.5.18's internally vendored React build (`next/dist/compiled/react`,
// pinned to a `19.2.0-canary` snapshot) doesn't export `useEffectEvent`,
// which `@sanity/vision`'s bundled code needs, while this project's own
// `react` dependency (19.2.1) does. `pnpm build` therefore still fails on
// this route until either Next is upgraded past the Turbopack fix or the
// project's React version is reconciled with what Next 15.5.18 vendors —
// both are broader, cross-cutting calls outside this fix's scope.
const LazyNextStudio = dynamic(() => import("next-sanity/studio").then((mod) => mod.NextStudio), {
  ssr: false,
  loading: () => <StudioLoadingFallback />,
});

function StudioLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
    </div>
  );
}

export default function StudioPage() {
  return <LazyNextStudio config={config} />;
}
