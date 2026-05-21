export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="h-9 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </main>
  );
}
