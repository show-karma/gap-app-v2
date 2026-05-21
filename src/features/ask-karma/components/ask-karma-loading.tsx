/**
 * Shared loading skeleton for both ask-karma route entries (root and
 * community-scoped). Mirrors the section layout of AskKarmaStart so the
 * page doesn't reflow when content arrives.
 */
export function AskKarmaLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <div className="h-9 w-2/3 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable for a single render
              key={idx}
              className="h-8 w-48 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable for a single render
              key={idx}
              className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
