export default function Loading() {
  // Skeleton matches the real page shape: eyebrow + headline + subtitle +
  // 4-up stat strip + 3 list rows. Replaces a centered spinner so the
  // layout doesn't jump when data arrives.
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for form calculation results, not loading spinners
    <div
      role="status"
      aria-label="Loading knowledge base"
      className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10"
    >
      {/* Eyebrow + headline + subtitle */}
      <div className="mb-2 h-3 w-32 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="h-9 w-64 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />

      {/* Stat strip */}
      <div className="mt-7 grid h-[88px] grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200 dark:bg-zinc-800 sm:grid-cols-4">
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
        <div className="bg-white dark:bg-zinc-900/60" />
      </div>

      {/* Filter bar */}
      <div className="mt-8 h-10 w-full max-w-md animate-pulse rounded-lg bg-stone-200 dark:bg-zinc-800" />

      {/* List rows */}
      <ul className="mt-4 divide-y divide-stone-200/70 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-5">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/70 dark:bg-zinc-800/70" />
            </div>
            <div className="hidden h-6 w-20 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}
