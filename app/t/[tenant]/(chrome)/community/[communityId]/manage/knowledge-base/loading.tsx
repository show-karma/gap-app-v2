export default function Loading() {
  // Skeleton matches the real page shape: eyebrow + headline + subtitle +
  // filter bar + 3 list rows. Replaces a centered spinner so the layout
  // doesn't jump when data arrives.
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for form calculation results, not loading spinners
    <div
      role="status"
      aria-label="Loading knowledge base"
      className="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7 sm:px-12"
    >
      {/* Eyebrow + headline + subtitle */}
      <div className="h-3 w-32 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-2 h-7 w-64 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />

      {/* Filter bar */}
      <div className="mt-7 mb-4 h-9 w-full max-w-md animate-pulse rounded-md bg-stone-200 dark:bg-zinc-800" />

      {/* List rows */}
      <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className={`flex items-center gap-3.5 px-4 py-3.5 ${
              i > 0 ? "border-t border-stone-200 dark:border-zinc-800" : ""
            }`}
          >
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-stone-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-zinc-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200/70 dark:bg-zinc-800/70" />
            </div>
            <div className="hidden h-5 w-20 animate-pulse rounded-full bg-stone-200 dark:bg-zinc-800 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}
