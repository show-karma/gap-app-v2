export default function BlogPostLoading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <output
        aria-label="Loading blog post"
        aria-busy="true"
        className="flex animate-pulse flex-col gap-4"
      >
        <div className="h-9 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 aspect-video w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-4/6 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </output>
    </main>
  );
}
