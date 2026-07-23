const SKELETON_CARDS = ["c1", "c2", "c3", "c4", "c5", "c6"];

export default function BlogLoading() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-10">
        <div className="h-9 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <output
        aria-label="Loading blog posts"
        aria-busy="true"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SKELETON_CARDS.map((card) => (
          <div
            key={card}
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800"
          >
            <div className="aspect-video w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </output>
    </main>
  );
}
